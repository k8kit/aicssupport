<?php
function checkAdminAuth($allowedRoles = []) {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
        http_response_code(401);
        sendResponse(false, null, 'Authentication required');
    }

    if (!empty($allowedRoles) && !in_array($_SESSION['role'], $allowedRoles)) {
        http_response_code(403);
        sendResponse(false, null, 'Access denied');
    }

    // Check session timeout (24 hours)
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > 86400) {
        session_destroy();
        http_response_code(401);
        sendResponse(false, null, 'Session expired');
    }

    return true;
}

function getCurrentUser() {
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'role' => $_SESSION['role'] ?? null,
        'full_name' => $_SESSION['full_name'] ?? null
    ];
}

function logActivity($userId, $action, $description, $applicationId = null) {
    try {
        $db = new Database();
        $db->query("
            INSERT INTO activity_logs (user_id, action, description, application_id, ip_address) 
            VALUES (?, ?, ?, ?, ?)
        ", [
            $userId,
            $action,
            $description,
            $applicationId,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
    } catch (Exception $e) {
        error_log("Activity logging error: " . $e->getMessage());
    }
}
?>