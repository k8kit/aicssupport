<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    checkAdminAuth(['admin']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $applicationId = $input['application_id'] ?? '';

    if (empty($applicationId)) {
        sendResponse(false, null, 'Application ID is required');
    }

    $db = new Database();
    $currentUser = getCurrentUser();

    // Update application status to Released
    $db->query("
        UPDATE applications 
        SET status = 'Released', updated_at = NOW() 
        WHERE id = ? AND status = 'Ready for release'
    ", [$applicationId]);

    if ($db->getConnection()->affected_rows === 0) {
        sendResponse(false, null, 'Application not found or not ready for release');
    }

    // Log activity
    logActivity(
        $currentUser['id'],
        'mark_released',
        'Application marked as released',
        $applicationId
    );

    sendResponse(true, null, 'Application marked as released successfully');

} catch (Exception $e) {
    error_log("Mark Released API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to mark application as released');
}
?>