<?php
session_start();
header('Content-Type: application/json');

require_once '../config.php';
require_once 'auth-middleware.php';

checkAdminAuth(['admin', 'approver', 'citymayor']);
$currentUser = getCurrentUser();
$admin_id = $currentUser['id'];

// Collect POST data
$username = sanitizeInput($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$full_name = sanitizeInput($_POST['full_name'] ?? '');
$email = sanitizeInput($_POST['email'] ?? '');
$license_number = sanitizeInput($_POST['license_number'] ?? '');

try {
    $db = new Database();

    // Get current admin info to delete old signature if needed
    $oldData = $db->fetchOne("SELECT e_signature FROM admin_users WHERE id = ?", [$admin_id]);
    $oldSignature = $oldData['e_signature'] ?? null;

    $newSignaturePath = $oldSignature; // default to existing one

    // File upload handling
    if (isset($_FILES['e_signature']) && $_FILES['e_signature']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../uploads/signatures';
        createDirectory($uploadDir);

        // Create filename: FullName_e_signature.png (sanitize for safety)
        $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $full_name);
        $newFileName = "{$safeName}_e_signature.png";
        $uploadPath = $uploadDir . '/' . $newFileName;

        // If an old signature exists and it's a different file, delete it
        if (!empty($oldSignature)) {
            $oldFilePath = '../../' . $oldSignature;
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }
        }

        // Save new file (replace if exists)
        if (!move_uploaded_file($_FILES['e_signature']['tmp_name'], $uploadPath)) {
            sendResponse(false, null, 'Failed to upload e-signature');
        }

        // Save relative path for DB
        $newSignaturePath = 'uploads/signatures/' . $newFileName;
    }

    // --- Update admin info ---
    $params = [$username, $full_name, $email, $license_number];
    $sql = "UPDATE admin_users SET username=?, full_name=?, email=?, license_number=?";

    // Hash password if provided
    if (!empty($password)) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $sql .= ", password=?";
        $params[] = $hashedPassword;
    }

    // Update e_signature path if new file uploaded
    if (!empty($newSignaturePath)) {
        $sql .= ", e_signature=?";
        $params[] = $newSignaturePath;
    }

    $sql .= " WHERE id=?";
    $params[] = $admin_id;

    $db->query($sql, $params);

    if (function_exists('logActivity')) {
        logActivity($admin_id, "Update Account", "Updated personal account information");
    }

    sendResponse(true, null, 'Account updated successfully');
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage());
}
