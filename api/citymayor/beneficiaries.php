<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');

try {
    checkAdminAuth(['citymayor']);

    $db = new Database();

    // ✅ Build base query and parameters
    $whereConditions = ["a.status = 'Released'"];
    $params = [];

    // ✅ Optional filter: program
    if (!empty($_GET['program'])) {
        $whereConditions[] = "a.service_type = ?";
        $params[] = $_GET['program'];
    }

    // ✅ Optional filter: date
    if (!empty($_GET['date'])) {
        $whereConditions[] = "DATE(a.updated_at) = ?";
        $params[] = $_GET['date'];
    }

    // ✅ Combine conditions
    $whereClause = implode(" AND ", $whereConditions);

    // ✅ Fetch beneficiaries
    $applications = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.beneficiary_full_name,
            a.status,
            a.email,
            a.updated_at,
            p.name AS service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE $whereClause
        ORDER BY a.updated_at ASC
    ", $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log("Approver Beneficiaries API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries');
}
?>
