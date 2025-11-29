<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

checkAdminAuth(['admin', 'approver', 'citymayor']); // Adjust roles if needed

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    if (!isset($_FILES['signature']) || $_FILES['signature']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'No signature uploaded or file error.']);
        exit;
    }

    // ✅ Use your actual session keys
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['full_name'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized: Missing session data.']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $full_name = $_SESSION['full_name'];

    // Sanitize file name
    $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $full_name);

    $upload_dir = '../../uploads/signatures/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $file_name = "{$safe_name}_e_signature.png";
    $target_path = $upload_dir . $file_name;
    $db_path = "uploads/signatures/" . $file_name;

    $file_type = mime_content_type($_FILES['signature']['tmp_name']);
    if ($file_type !== 'image/png') {
        echo json_encode(['success' => false, 'message' => 'Only PNG images are allowed.']);
        exit;
    }

    if (!move_uploaded_file($_FILES['signature']['tmp_name'], $target_path)) {
        echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file.']);
        exit;
    }

    // ✅ Update the e_signature in admin_users table
    $db = new Database();
    $update = $db->query("UPDATE admin_users SET e_signature = ? WHERE id = ?", [$db_path, $user_id]);

    if ($update) {
        echo json_encode([
            'success' => true,
            'message' => 'E-signature uploaded successfully.',
            'signature_path' => $db_path
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update signature in database.']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
