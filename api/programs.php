<?php
require_once 'config.php';

try {
    $db = new Database();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $programs = $db->fetchAll("
                SELECT id, name, description, requirements 
                FROM programs 
                ORDER BY name ASC
            ");
            
            sendResponse(true, $programs);
            break;
            
        default:
            http_response_code(405);
            sendResponse(false, null, 'Method not allowed');
            break;
    }
} catch (Exception $e) {
    error_log("Programs API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to fetch programs');
}
?>