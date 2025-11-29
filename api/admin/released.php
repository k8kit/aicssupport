<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    $department = $_SESSION['department'] ?? null;

    // Build query with filters
    $whereConditions = [];
    $params = [];

    // ✅ Status filter - default to 'Released' if not specified or if empty
    if (!empty($_GET['status'])) {
        $whereConditions[] = "a.status = ?";
        $params[] = $_GET['status'];
    } else {
        // Default to Released only
        $whereConditions[] = "a.status = 'Released'";
    }

    // ✅ Filter by department if available
    if ($department) {
        $whereConditions[] = "p.department = ?";
        $params[] = $department;
    }

    if (!empty($_GET['program_id'])) {
        $whereConditions[] = "a.service_type = ?";
        $params[] = $_GET['program_id'];
    }

    // ✅ Date range filter
    if (!empty($_GET['from_date']) && !empty($_GET['to_date'])) {
        $whereConditions[] = "DATE(a.updated_at) BETWEEN ? AND ?";
        $params[] = $_GET['from_date'];
        $params[] = $_GET['to_date'];
    }

    $whereClause = implode(' AND ', $whereConditions);
    
    // ✅ Use INNER JOIN to match analytics.php
    $applications = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.beneficiary_full_name,
            a.status,
            a.updated_at,
            a.created_at,
            a.email,
            p.name as service_name,
            p.department
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE $whereClause
        ORDER BY a.updated_at ASC
    ", $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log("Beneficiaries API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries');
}
?>