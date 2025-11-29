<?php
/**
 * Public API endpoint for displaying content updates on homepage
 * No authentication required
 */
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $db = new Database();

    // Only fetch active content updates
    $contents = $db->fetchAll(
        "SELECT 
            id,
            title,
            description,
            image_path,
            display_order,
            created_at
         FROM content_updates 
         WHERE is_active = 1
         ORDER BY display_order ASC, created_at DESC
         LIMIT 6"
    );

    sendResponse(true, $contents);

} catch (Exception $e) {
    error_log('Content Updates Public API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to load content updates');
}


?>