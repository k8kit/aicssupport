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

$data = json_decode(file_get_contents('php://input'), true);

$applicationId = $data['application_id'] ?? '';
$signatureData = $data['signature_data'] ?? '';
$signaturePosition = $data['signature_position'] ?? 'staff';

if (empty($applicationId) || empty($signatureData)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Application ID and signature data are required']);
    exit();
}

// Validate base64 format
if (!preg_match('/^data:image\/(png|jpeg|jpg);base64,/', $signatureData)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid signature data format']);
    exit();
}

// Decode signature
$signatureData = preg_replace('/^data:image\/(png|jpeg|jpg);base64,/', '', $signatureData);
$signatureData = base64_decode($signatureData);

if ($signatureData === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Failed to decode signature data']);
    exit();
}

try {
    $db = new Database();
    $userId = $_SESSION['user_id'];

    // ✅ Fetch admin full name and current e-signature path
    $admin = $db->fetchOne("SELECT full_name, e_signature FROM admin_users WHERE id = ?", [$userId]);

    if (!$admin) {
        throw new Exception("Admin not found for user_id: $userId");
    }

    $fullName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $admin['full_name']);
    $uploadDir = __DIR__ . '/../../uploads/signatures/';

    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // ✅ Construct new filename
    $filename = $fullName . '_e_signature.png';
    $filepath = $uploadDir . $filename;

    // ✅ Remove old file if it exists (overwrite cleanly)
    if (!empty($admin['e_signature'])) {
        $oldFile = __DIR__ . '/../../' . $admin['e_signature'];
        if (file_exists($oldFile)) {
            unlink($oldFile);
        }
    }

    // ✅ Save new signature
    if (file_put_contents($filepath, $signatureData) === false) {
        throw new Exception("Failed to save new signature file");
    }

    $relativePath = 'uploads/signatures/' . $filename;

    // ✅ Update both tables with the same new path
    $db->query("UPDATE admin_users SET e_signature = ?, updated_at = NOW() WHERE id = ?", [$relativePath, $userId]);
    $db->query("UPDATE applications SET staff_signature_path = ?, updated_at = NOW() WHERE id = ?", [$relativePath, $applicationId]);

    echo json_encode([
        'success' => true,
        'message' => 'E-signature updated successfully',
        'data' => [
            'signature_path' => $relativePath,
            'full_name' => $admin['full_name']
        ]
    ]);
}
catch (Exception $e) {
    error_log("Error in save-signature.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
