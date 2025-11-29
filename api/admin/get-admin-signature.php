<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config.php';
require_once 'auth-middleware.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

try {
    $db = new Database();
    $userId = $_SESSION['user_id'];

    // ✅ Include license_number
    $admin = $db->fetchOne("SELECT full_name, e_signature, license_number FROM admin_users WHERE id = ?", [$userId]);

    if ($admin) {
        echo json_encode([
            'success' => true,
            'data' => [
                'full_name' => $admin['full_name'],
                'e_signature' => $admin['e_signature'],
                'license_number' => $admin['license_number']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Admin not found']);
    }

} catch (Exception $e) {
    error_log("Error in get-admin-signature.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
