<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);

    $db = new Database();

    // ✅ Get admin's department from session
    $department = $_SESSION['department'] ?? null;

    if (!$department) {
        sendResponse(false, null, 'Unauthorized access: missing department');
    }

    // Build query with filters
    $whereConditions = ["a.status = 'Pending for approval'", "p.department = ?"];
    $params = [$department];

    // Optional filters: program or date
    if (!empty($_GET['program'])) {
        $whereConditions[] = "a.service_type = ?";
        $params[] = $_GET['program'];
    }

    if (!empty($_GET['date'])) {
        $whereConditions[] = "DATE(a.created_at) = ?";
        $params[] = $_GET['date'];
    }

    $whereClause = implode(' AND ', $whereConditions);

    // ✅ Main query with recently_released detection
    $applications = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.client_full_name,
            a.client_last_name,
            a.client_first_name,
            a.client_middle_name,
            a.client_extension,
            a.email,
            a.beneficiary_full_name,
            a.status,
            a.contact_number,
            a.created_at,
            p.name AS service_name,
            p.department AS program_department,
            
            -- ✅ Check if applicant already has a released record (same beneficiary & service_type)
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM applications a2
                    WHERE a2.beneficiary_full_name = a.beneficiary_full_name
                      AND a2.service_type = a.service_type
                      AND a2.status = 'Released'
                      AND a2.updated_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
                      AND a2.id != a.id  -- avoid matching itself
                )
                THEN 1
                ELSE 0
            END AS recently_released

        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE $whereClause
        ORDER BY a.created_at DESC
    ", $params);

    sendResponse(true, $applications);

} catch (Exception $e) {
    error_log('Applicants API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to load applicants');
}
?>
