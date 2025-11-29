<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

try {
    $db = new Database();
    $user = $db->fetchOne("SELECT full_name, e_signature FROM admin_users WHERE id = ?", [$_SESSION['user_id']]);
    if ($user) {
        echo json_encode(['success' => true, 'data' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
