<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config.php';
require_once 'auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$applicationId = $data['application_id'] ?? '';
$signaturePath = $data['signature_path'] ?? '';

if (empty($applicationId) || empty($signaturePath)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing application ID or signature path']);
    exit();
}

try {
    $db = new Database();
    $userId = $_SESSION['user_id'];

    // ✅ Get user info
    $user = $db->fetchOne("SELECT full_name, license_number, role FROM admin_users WHERE id = ?", [$userId]);
    if (!$user) {
        throw new Exception("User not found");
    }

    $role = strtolower($user['role']);
    $query = "";
    $params = [];

    // ✅ ADMIN (staff) – has license number and full name
    if ($role === 'admin') {
        $query = "
            UPDATE applications 
            SET staff_signature_path = ?, 
                staff_full_name = ?, 
                staff_license_number = ?, 
                updated_at = NOW() 
            WHERE id = ?
        ";
        $params = [$signaturePath, $user['full_name'], $user['license_number'], $applicationId];
    }
    // ✅ APPROVER – signature AND full name
    elseif ($role === 'approver') {
        $query = "
            UPDATE applications 
            SET approver_signature_path = ?, 
                approver_name = ?,
                updated_at = NOW() 
            WHERE id = ?
        ";
        $params = [$signaturePath, $user['full_name'], $applicationId];
    }
    // ✅ CITY MAYOR – signature AND full name
    elseif ($role === 'citymayor') {
        $query = "
            UPDATE applications 
            SET mayor_signature_path = ?, 
                mayor_name = ?,
                updated_at = NOW() 
            WHERE id = ?
        ";
        $params = [$signaturePath, $user['full_name'], $applicationId];
    }
    else {
        throw new Exception("Unsupported role: {$role}");
    }

    $db->query($query, $params);

    echo json_encode([
        'success' => true,
        'message' => ucfirst($role) . ' E-Signature applied successfully',
        'data' => [
            'role' => $role,
            'signature_path' => $signaturePath,
            'full_name' => $user['full_name'],
            'license_number' => $role === 'admin' ? $user['license_number'] : null
        ]
    ]);
} catch (Exception $e) {
    error_log("Error in apply-signature.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>