<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');


try {
    checkAdminAuth(['citymayor']);
    
    $db = new Database();
    
    $urgentApplications = $db->fetchAll("
        SELECT 
            a.reference_no,
            a.client_full_name,
            a.created_at,
            p.name as service_name,
            DATEDIFF(NOW(), a.updated_at) as days_waiting
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Waiting for approval of city mayor'
        AND DATEDIFF(NOW(), a.updated_at) >= 3
        ORDER BY days_waiting ASC
        LIMIT 10
    ");

    sendResponse(true, $urgentApplications);

} catch (Exception $e) {
    error_log("Urgent Applications API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load urgent applications');
}
?>