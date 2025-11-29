<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    $programs = $db->fetchAll("
        SELECT id, name, description
        FROM programs
        ORDER BY name ASC
    ");
    
    sendResponse(true, $programs);

} catch (Exception $e) {
    error_log("Get Programs API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load programs');
}
?>
