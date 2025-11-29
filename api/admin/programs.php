<?php
session_start();
require_once '../config.php';

try {
    $db = new Database();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':

            // ✅ Check if admin is logged in and has department
            $department = $_SESSION['department'] ?? null;

            if ($department) {
                // Logged-in admin → show only their department's programs
                $programs = $db->fetchAll("
                    SELECT id, name, description, requirements, department 
                    FROM programs 
                    WHERE department = ?
                    ORDER BY name ASC
                ", [$department]);
            } else {
                // Guest/public access → show all programs (optional)
                $programs = $db->fetchAll("
                    SELECT id, name, description, requirements, department 
                    FROM programs 
                    ORDER BY name ASC
                ");
            }

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
