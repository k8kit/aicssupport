<?php
session_start();
require_once 'config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendResponse(false, null, 'Username and password are required');
    }

    $db = new Database();

    // Fetch user record
    $user = $db->fetchOne("
        SELECT id, username, password, role, full_name, is_active, department 
        FROM admin_users 
        WHERE username = ? AND is_active = 1
    ", [$username]);

    if (!$user) {
        sendResponse(false, null, 'Invalid username or password');
    }

    // ✅ Secure password check
    if (!password_verify($password, $user['password'])) {
        sendResponse(false, null, 'Invalid username or password');
    }

    // Create session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['department'] = $user['department'];
    $_SESSION['login_time'] = time();

    // Log login activity
    $db->query("
        INSERT INTO activity_logs (user_id, action, description, ip_address) 
        VALUES (?, 'login', 'User logged in', ?)
    ", [$user['id'], $_SERVER['REMOTE_ADDR'] ?? 'unknown']);

    // Send response
    sendResponse(true, [
        'role' => $user['role'],
        'username' => $user['username'],
        'full_name' => $user['full_name'],
        'department' => $user['department']
    ], 'Login successful');

} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    sendResponse(false, null, 'Authentication failed');
}
?>
