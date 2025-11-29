<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();

    // ✅ Get department from session
    $department = $_SESSION['department'] ?? null;
    if (!$department) {
        sendResponse(false, null, 'Unauthorized access: missing department');
    }

    // ✅ Department-based filter (joins to programs table)
    $departmentFilter = "AND p.department = ?";

    // ✅ Ready for Release (department-based)
    $readyForRelease = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Ready for release' $departmentFilter
    ", [$department])['count'];

    // ✅ Released Today
    $releasedToday = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Released'
        AND DATE(a.updated_at) = CURDATE()
        $departmentFilter
    ", [$department])['count'];

    // ✅ Released This Week
    $releasedThisWeek = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Released'
        AND YEARWEEK(a.updated_at) = YEARWEEK(NOW())
        $departmentFilter
    ", [$department])['count'];

    // ✅ Released This Month
    $releasedThisMonth = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE a.status = 'Released'
        AND YEAR(a.updated_at) = YEAR(NOW())
        AND MONTH(a.updated_at) = MONTH(NOW())
        $departmentFilter
    ", [$department])['count'];

    // ✅ Send filtered stats
    sendResponse(true, [
        'department' => $department,
        'ready_for_release' => $readyForRelease,
        'released_today' => $releasedToday,
        'released_this_week' => $releasedThisWeek,
        'released_this_month' => $releasedThisMonth
    ]);

} catch (Exception $e) {
    error_log("Beneficiaries Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries statistics');
}
?>
