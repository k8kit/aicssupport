<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');


try {
    checkAdminAuth(['approver']);
    
    $db = new Database();
    
    $applications = $db->fetchAll("
        SELECT 
            a.reference_no,
            a.client_full_name,
            a.created_at,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Approved'
        ORDER BY a.updated_at DESC
        LIMIT 5
    ");

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log("Recent Applications API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load recent applications');
}
?>