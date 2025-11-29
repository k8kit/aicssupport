<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');


try {
    checkAdminAuth(['citymayor']);
    
    $db = new Database();
    
    // Get city mayor specific stats
    $awaitingApproval = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Waiting for approval of city mayor'")['count'];
    $approvedByMayor = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Ready for release'")['count'];
    $approvedThisMonth = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Ready for release' AND YEAR(updated_at) = YEAR(NOW()) AND MONTH(updated_at) = MONTH(NOW())")['count'];

    // Get trends data for last 6 months
    $trendsData = $db->fetchAll("
        SELECT 
            DATE_FORMAT(updated_at, '%Y-%m') as month,
            COUNT(CASE WHEN status = 'Waiting for approval of city mayor' THEN 1 END) as received,
            COUNT(CASE WHEN status = 'Ready for release' THEN 1 END) as approved
        FROM applications 
        WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
        ORDER BY month ASC
    ");

    // Get program distribution
    $programData = $db->fetchAll("
        SELECT p.name, COUNT(a.id) as count 
        FROM programs p 
        LEFT JOIN applications a ON p.id = a.service_type 
        WHERE a.status IN ('Ready for release', 'Released')
        GROUP BY p.id, p.name 
        ORDER BY count DESC
    ");

    sendResponse(true, [
        'awaiting_approval' => $awaitingApproval,
        'approved_by_mayor' => $approvedByMayor,
        'approved_this_month' => $approvedThisMonth,
        'trends_data' => $trendsData,
        'program_data' => $programData
    ]);

} catch (Exception $e) {
    error_log("City Mayor Dashboard Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load dashboard statistics');
}
?>