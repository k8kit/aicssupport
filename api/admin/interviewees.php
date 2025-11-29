<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();

    // ✅ Get logged-in admin’s department
    $department = $_SESSION['department'] ?? null;

    // Build query with filters
    $whereConditions = ["a.status = 'Approved'"];
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
        $whereConditions[] = "DATE(a.created_at) = ?";
        $params[] = $_GET['date'];
    }

    $whereClause = implode(' AND ', $whereConditions);

    $applications = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.client_full_name,
            a.email,
            a.status,
            a.created_at,
            a.interview_date,
            a.interview_time,
            p.name AS service_name,
            p.department AS department
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE $whereClause
        ORDER BY a.created_at DESC
    ", $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log('Interviewees API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to load interviewees');
}
?>
