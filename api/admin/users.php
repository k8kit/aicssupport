<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['approver']);
    
    $db = new Database();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['id'])) {
                // Get single user
                $user = $db->fetchOne("SELECT * FROM admin_users WHERE id = ?", [$_GET['id']]);
                sendResponse(true, $user);
            } else {
                // Get all users
                $users = $db->fetchAll("SELECT id, username, full_name, role, department, email, is_active, created_at FROM admin_users ORDER BY created_at DESC");
                sendResponse(true, $users);
            }
            break;
            
        case 'POST':
            // Debug: Log POST data
            error_log("POST data received: " . print_r($_POST, true));
            
            // Create new user
            $username = trim(sanitizeInput($_POST['username'] ?? ''));
            $password = $_POST['password'] ?? '';
            $role = sanitizeInput($_POST['role'] ?? '');
            $department = trim(sanitizeInput($_POST['department'] ?? ''));
            $fullName = trim(sanitizeInput($_POST['full_name'] ?? ''));
            $email = trim(sanitizeInput($_POST['email'] ?? ''));

            // Debug: Log processed values
            error_log("Processed values - username: '$username', password length: " . strlen($password) . ", role: '$role', department: '$department', fullName: '$fullName'");

            // Validation
            if (empty($username)) {
                error_log("Validation failed: username is empty");
                sendResponse(false, null, 'Username is required');
            }
            
            if (empty($password)) {
                error_log("Validation failed: password is empty");
                sendResponse(false, null, 'Password is required');
            }
            
            if (empty($role)) {
                error_log("Validation failed: role is empty");
                sendResponse(false, null, 'Role is required');
            }
            
            if (empty($fullName)) {
                error_log("Validation failed: full name is empty");
                sendResponse(false, null, 'Full name is required');
            }

            // Department is required for admin role
            if ($role === 'admin' && empty($department)) {
                error_log("Validation failed: department is empty for admin role");
                sendResponse(false, null, 'Department is required for admin users');
            }

            if (strlen($password) < 6) {
                error_log("Validation failed: password too short");
                sendResponse(false, null, 'Password must be at least 6 characters long');
            }

            // Check if username exists
            $existing = $db->fetchOne("SELECT id FROM admin_users WHERE username = ?", [$username]);
            if ($existing) {
                error_log("Validation failed: username already exists");
                sendResponse(false, null, 'Username already exists');
            }

            // Hash the password using password_hash (secure encryption)
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            error_log("Password hashed successfully using PASSWORD_DEFAULT");

            // Insert user with department (null for non-admin roles)
            $departmentValue = ($role === 'admin') ? $department : null;

            $db->query("
                INSERT INTO admin_users (username, password, role, department, full_name, email) 
                VALUES (?, ?, ?, ?, ?, ?)
            ", [$username, $hashedPassword, $role, $departmentValue, $fullName, $email]);

            error_log("User created successfully with encrypted password");
            sendResponse(true, null, 'User created successfully');
            break;
            
        case 'PUT':
            // Update user (expects JSON)
            $rawInput = file_get_contents("php://input");
            error_log("PUT raw input: " . $rawInput);
            
            $putData = json_decode($rawInput, true);
            error_log("PUT decoded data: " . print_r($putData, true));
            
            $userId = $putData['user_id'] ?? '';
            $username = trim(sanitizeInput($putData['username'] ?? ''));
            $role = sanitizeInput($putData['role'] ?? '');
            $department = trim(sanitizeInput($putData['department'] ?? ''));
            $fullName = trim(sanitizeInput($putData['full_name'] ?? ''));
            $email = trim(sanitizeInput($putData['email'] ?? ''));
            $password = $putData['password'] ?? '';

            error_log("Processed PUT values - userId: '$userId', username: '$username', role: '$role', department: '$department', fullName: '$fullName'");

            if (empty($userId)) {
                error_log("Validation failed: user_id is empty");
                sendResponse(false, null, 'User ID is required');
            }
            
            if (empty($username)) {
                error_log("Validation failed: username is empty");
                sendResponse(false, null, 'Username is required');
            }
            
            if (empty($role)) {
                error_log("Validation failed: role is empty");
                sendResponse(false, null, 'Role is required');
            }
            
            if (empty($fullName)) {
                error_log("Validation failed: full name is empty");
                sendResponse(false, null, 'Full name is required');
            }

            // Department is required for admin role
            if ($role === 'admin' && empty($department)) {
                error_log("Validation failed: department is empty for admin role");
                sendResponse(false, null, 'Department is required for admin users');
            }

            // Set department value (null for non-admin roles)
            $departmentValue = ($role === 'admin') ? $department : null;

            $updateSql = "UPDATE admin_users SET username = ?, role = ?, department = ?, full_name = ?, email = ?";
            $params = [$username, $role, $departmentValue, $fullName, $email];

            if (!empty($password)) {
                if (strlen($password) < 6) {
                    error_log("Validation failed: password too short");
                    sendResponse(false, null, 'Password must be at least 6 characters long');
                }
                // Hash the new password using password_hash (secure encryption)
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $updateSql .= ", password = ?";
                $params[] = $hashedPassword;
                error_log("Password will be updated with new encrypted hash");
            }

            $updateSql .= " WHERE id = ?";
            $params[] = $userId;

            error_log("Executing update query");
            $db->query($updateSql, $params);
            error_log("User updated successfully");
            sendResponse(true, null, 'User updated successfully');
            break;
            
        case 'PATCH':
            // Toggle user status
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $input['user_id'] ?? '';
            
            if (empty($userId)) {
                sendResponse(false, null, 'User ID is required');
            }

            $db->query("UPDATE admin_users SET is_active = NOT is_active WHERE id = ?", [$userId]);
            sendResponse(true, null, 'User status updated successfully');
            break;
            
        case 'DELETE':
            // Delete user
            $userId = $_GET['id'] ?? '';
            
            if (empty($userId)) {
                sendResponse(false, null, 'User ID is required');
            }

            // Prevent deleting admin user
            $user = $db->fetchOne("SELECT username FROM admin_users WHERE id = ?", [$userId]);
            if ($user && $user['username'] === 'admin') {
                sendResponse(false, null, 'Cannot delete admin user');
            }

            $db->query("DELETE FROM admin_users WHERE id = ?", [$userId]);
            sendResponse(true, null, 'User deleted successfully');
            break;
            
        default:
            http_response_code(405);
            sendResponse(false, null, 'Method not allowed');
            break;
    }

} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendResponse(false, null, 'Failed to process user request');
}
?>