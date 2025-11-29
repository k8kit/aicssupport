<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin', 'approver', 'citymayor']);
    
    $applicationId = $_GET['application_id'] ?? '';
    
    if (empty($applicationId)) {
        sendResponse(false, null, 'Application ID is required');
    }

    $db = new Database();
    
    // Get documents for the application
    $documents = $db->fetchAll("
        SELECT 
            id,
            file_name,
            file_path,
            file_type,
            uploaded_at
        FROM documents 
        WHERE application_id = ? 
        ORDER BY uploaded_at ASC
    ", [$applicationId]);

    sendResponse(true, $documents);

} catch (Exception $e) {
    error_log("Documents API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load documents');
}
?>