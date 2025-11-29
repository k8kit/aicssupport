<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    $department = $_SESSION['department'] ?? null;

    // Build query with filters
    $whereConditions = ["a.status = 'Ready for release'"];
    $params = [];

    // ✅ Filter by department if available
    if ($department) {
        $whereConditions[] = "p.department = ?";
        $params[] = $department;
    }

    if (!empty($_GET['program'])) {
        $whereConditions[] = "a.service_type = ?";
        $params[] = $_GET['program'];
    }

    if (!empty($_GET['date'])) {
        $whereConditions[] = "DATE(a.updated_at) = ?";
        $params[] = $_GET['date'];
    }

    $whereClause = implode(' AND ', $whereConditions);
    $applications = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.client_full_name,
            a.status,
            a.updated_at,
            a.email,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE  $whereClause
        ORDER BY a.updated_at ASC
    ", $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log("Beneficiaries API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries');
}
?>