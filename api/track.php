<?php
require_once 'config.php';
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $db = new Database();
    
    if (isset($input['action']) && $input['action'] === 'forgot_reference') {
        // Forward to forgot reference handler
        include 'forgot-reference.php';
        exit;

    } else {
        // Handle application tracking
        $referenceNumber = sanitizeInput($input['reference_number'] ?? '');
        
        if (empty($referenceNumber)) {
            sendResponse(false, null, 'Reference number is required');
        }

        $application = $db->fetchOne("
            SELECT a.*, p.name as service_name
            FROM applications a 
            LEFT JOIN programs p ON a.service_type = p.id 
            WHERE a.reference_no = ?
        ", [$referenceNumber]);

        if (!$application) {
            sendResponse(false, null, 'Application not found. Please check your reference number.');
        }

        // Get family members
        $familyMembers = $db->fetchAll("
            SELECT full_name, sex, birthdate, relationship 
            FROM family_members 
            WHERE application_id = ?
        ", [$application['id']]);

        // Get documents
        $documents = $db->fetchAll("
            SELECT file_name, file_type, uploaded_at 
            FROM documents 
            WHERE application_id = ?
        ", [$application['id']]);

        $application['family_members'] = $familyMembers;
        $application['documents'] = $documents;

        sendResponse(true, $application);
    }

} catch (Exception $e) {
    error_log("Track API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to process request');
}
?>