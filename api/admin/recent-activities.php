<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin', 'approver', 'citymayor']);
    
    $db = new Database();

    // ✅ Get the logged-in admin's department
    $department = $_SESSION['department'] ?? null;

    if (!$department) {
        sendResponse(false, null, 'Unauthorized access: missing department');
    }

    /*  
        Logic:
        - Each activity_log entry is linked to a user (admin_users)
        - Each admin has a department in admin_users table
        - So, we filter by au.department = ?
    */
    $activities = $db->fetchAll("
        SELECT 
            al.action,
            al.description,
            al.created_at,
            au.full_name AS user_name,
            au.department
        FROM activity_logs al
        LEFT JOIN admin_users au ON al.user_id = au.id
        WHERE au.department = ?
        ORDER BY al.created_at DESC
        LIMIT 10
    ", [$department]);

    // ✅ If no activity found for that department, show a default system log
    if (empty($activities)) {
        $activities = [
            [
                'action' => 'system_start',
                'description' => 'No recent activities for your department',
                'created_at' => date('Y-m-d H:i:s'),
                'user_name' => 'System',
                'department' => $department
            ]
        ];
    }

    sendResponse(true, $activities);

} catch (Exception $e) {
    error_log("Recent Activities API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load recent activities');
}
?>
