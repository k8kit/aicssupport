<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin', 'approver', 'citymayor']);
    
    $applicationId = $_GET['id'] ?? '';
    
    if (empty($applicationId)) {
        sendResponse(false, null, 'Application ID is required');
    }

    $db = new Database();
    
    // Get application details
    $application = $db->fetchOne("
        SELECT 
            a.*,
            p.name as service_name,
            p.requirements
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.id = ?
    ", [$applicationId]);

    if (!$application) {
        sendResponse(false, null, 'Application not found');
    }

    // Get family members
    $familyMembers = $db->fetchAll("
        SELECT * FROM family_members 
        WHERE application_id = ? 
        ORDER BY id ASC
    ", [$applicationId]);

    // Get documents
    $documents = $db->fetchAll("
        SELECT * FROM documents 
        WHERE application_id = ? 
        ORDER BY uploaded_at ASC
    ", [$applicationId]);

    $application['family_members'] = $familyMembers;
    $application['documents'] = $documents;

    sendResponse(true, $application);

} catch (Exception $e) {
    error_log("Application Details API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load application details');
}
?>