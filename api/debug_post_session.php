<?php
/**
 * Debug file to check session during POST request
 * Place in api/ folder temporarily
 * Test by doing a POST request to this file
 */

session_start();
header('Content-Type: application/json');

// Simulate what happens in your POST request
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    // Get all possible admin ID variations
    $sessionData = [
        'user_id' => $_SESSION['user_id'] ?? 'NOT SET',
        'admin_id' => $_SESSION['admin_id'] ?? 'NOT SET',
        'id' => $_SESSION['id'] ?? 'NOT SET',
        'all_session_keys' => array_keys($_SESSION),
        'full_session' => $_SESSION
    ];
    
    // Try to determine which one has a value
    $adminId = $_SESSION['user_id'] ?? $_SESSION['admin_id'] ?? $_SESSION['id'] ?? null;
    
    echo json_encode([
        'success' => true,
        'message' => 'Session check successful',
        'data' => $sessionData,
        'determined_admin_id' => $adminId,
        'has_admin_id' => $adminId !== null
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'session_keys' => array_keys($_SESSION)
    ], JSON_PRETTY_PRINT);
}
?>