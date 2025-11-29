<?php
session_start();
require_once '../config.php';
require_once '../admin/auth-middleware.php';

try {
    // Only allow city mayors
    checkAdminAuth(['citymayor']);
    
    $db = new Database();

    // ✅ Get optional filters from query string
    $program = $_GET['program'] ?? '';
    $date = $_GET['date'] ?? '';

    // ✅ Base query
    $sql = "
        SELECT 
            a.id,
            a.reference_no,
            a.client_full_name,
            a.client_last_name,
            a.client_first_name,
            a.client_middle_name,
            a.email,
            a.status,
            a.contact_number,
            a.updated_at,
            p.name AS service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Waiting for approval of city mayor'
    ";

    $params = [];

    // ✅ Apply Program Filter
    if (!empty($program)) {
        $sql .= " AND a.service_type = ?";
        $params[] = $program;
    }

    // ✅ Apply Date Filter
    if (!empty($date)) {
        $sql .= " AND DATE(a.updated_at) = ?";
        $params[] = $date;
    }

    $sql .= " ORDER BY a.updated_at ASC";

    // ✅ Execute query safely
    $applications = $db->fetchAll($sql, $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log("Approver Applicants API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load applicants for approval');
}
?>
