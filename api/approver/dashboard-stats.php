<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');


try {
    checkAdminAuth(['approver']);
    
    $db = new Database();
    
    // Get approver-specific stats
    $pendingReview = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Waiting for approval of head'")['count'];
    $approvedApplications = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Waiting for approval of heads'")['count'];
    $forwardedMayor = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Waiting for approval of city mayor'")['count'];

    // Get approval activity for last 7 days
    $approvalActivity = $db->fetchAll("
        SELECT 
            DATE(updated_at) as date,
            COUNT(CASE WHEN status = 'Waiting for approval of city mayor' THEN 1 END) as approvals,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejections
        FROM applications 
        WHERE DATE(updated_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(updated_at)
        ORDER BY date ASC
    ");

    // Decision distribution
    $decisionData = [
        'approved' => $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Waiting for approval of city mayor'")['count'],
        'forwarded' => $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Ready for release'")['count'],
        'rejected' => $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Rejected'")['count']
    ];

    sendResponse(true, [
        'pending_review' => $pendingReview,
        'approved_applications' => $approvedApplications,
        'forwarded_mayor' => $forwardedMayor,
        'approval_activity' => $approvalActivity,
        'decision_data' => $decisionData
    ]);

} catch (Exception $e) {
    error_log("Approver Dashboard Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load dashboard statistics');
}
?>