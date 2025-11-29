<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();

    // ✅ Get admin department from session
    $department = $_SESSION['department'] ?? null;

    if (!$department) {
        sendResponse(false, null, 'Unauthorized access: missing department');
    }

    // ✅ Add department-based filtering condition
    // The applications are linked to programs via service_type = program.id
    $departmentFilter = "AND p.department = ?";

    // Total Applicants (Pending for approval)
    $totalApplicants = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Pending for approval' $departmentFilter
    ", [$department])['count'];

    // Total Interviewees (Approved)
    $totalInterviewees = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Approved' $departmentFilter
    ", [$department])['count'];

    // Total Beneficiaries (Ready for release or Released)
    $totalBeneficiaries = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status IN ('Ready for release') $departmentFilter
    ", [$department])['count'];

    // Approved Today
    $approvedToday = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE DATE(a.updated_at) = CURDATE() 
        AND a.status IN ('Released', 'Ready for release')
        $departmentFilter
    ", [$department])['count'];

    // Programs Data for Chart
    $programsData = $db->fetchAll("
        SELECT p.name, COUNT(a.id) as count 
        FROM programs p 
        LEFT JOIN applications a ON p.id = a.service_type 
        WHERE p.department = ?
        GROUP BY p.id, p.name 
        ORDER BY count DESC
    ", [$department]);

    // Status Distribution
    $statusData = $db->fetchAll("
        SELECT a.status, COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE p.department = ?
        GROUP BY a.status
    ", [$department]);

    $statusCounts = [
        'pending' => 0,
        'approved' => 0,
        'rejected' => 0,
        'waiting' => 0,
        'ready' => 0
    ];

    foreach ($statusData as $status) {
        switch ($status['status']) {
            case 'Pending for approval':
                $statusCounts['pending'] = $status['count'];
                break;
            case 'Approved':
                $statusCounts['approved'] = $status['count'];
                break;
            case 'Rejected':
                $statusCounts['rejected'] = $status['count'];
                break;
            case 'Waiting for approval of heads/city mayor':
                $statusCounts['waiting'] = $status['count'];
                break;
            case 'Ready for release':
                $statusCounts['ready'] = $status['count'];
                break;
        }
    }

    // Monthly Approvals (Last 6 Months)
    $monthlyData = $db->fetchAll("
        SELECT 
            DATE_FORMAT(a.updated_at, '%Y-%m') as month,
            COUNT(*) as count
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status IN ('Ready for release', 'Released') 
        AND a.updated_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND p.department = ?
        GROUP BY DATE_FORMAT(a.updated_at, '%Y-%m')
        ORDER BY month ASC
    ", [$department]);

    // ✅ Send department-based stats
    sendResponse(true, [
        'department' => $department,
        'total_applicants' => $totalApplicants,
        'total_interviewees' => $totalInterviewees,
        'total_beneficiaries' => $totalBeneficiaries,
        'approved_today' => $approvedToday,
        'programs_data' => $programsData,
        'status_data' => $statusCounts,
        'monthly_data' => $monthlyData
    ]);

} catch (Exception $e) {
    error_log("Dashboard Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load dashboard statistics');
}
?>
