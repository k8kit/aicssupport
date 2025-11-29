<?php
session_start();
header('Content-Type: application/json');

require_once '../config.php';
require_once 'auth-middleware.php';

// Check if user is logged in and is an admin
checkAdminAuth(['admin', 'approver', 'citymayor']);
$currentUser = getCurrentUser();
$admin_id = $currentUser['id'];

try {
    $db = new Database();
    $sql = "SELECT username, role, full_name, email, department, license_number, e_signature 
            FROM admin_users 
            WHERE id = ?";
    $data = $db->fetchOne($sql, [$admin_id]);

    if ($data) {
        sendResponse(true, $data);
    } else {
        sendResponse(false, null, 'Admin not found');
    }
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage());
}