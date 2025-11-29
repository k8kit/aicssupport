<?php
session_start();
require_once '../config.php';
require_once(__DIR__ . '/../admin/auth-middleware.php');

try {
    checkAdminAuth(['approver']);

    $db = new Database();

    // Get filter parameters
    $user_id = isset($_GET['user_id']) && $_GET['user_id'] !== '' ? intval($_GET['user_id']) : null;
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;
    $export_all = isset($_GET['export']) && $_GET['export'] === 'all';
    
    // Pagination (skip if exporting all)
    $page = isset($_GET['page']) ? max(intval($_GET['page']), 1) : 1;
    $limit = 20;
    $offset = ($page - 1) * $limit;

    // Base query
    $sql = "
        SELECT 
            al.*, 
            au.full_name, 
            a.reference_no AS application_reference_no
        FROM activity_logs AS al
        LEFT JOIN admin_users AS au ON au.id = al.user_id
        LEFT JOIN applications AS a ON a.id = al.application_id
        WHERE 1
    ";

    $params = [];

    // Apply filters dynamically
    if ($user_id) {
        $sql .= " AND al.user_id = ?";
        $params[] = $user_id;
    }
    if ($start_date) {
        $sql .= " AND al.created_at >= ?";
        $params[] = $start_date . ' 00:00:00';
    }
    if ($end_date) {
        $sql .= " AND al.created_at <= ?";
        $params[] = $end_date . ' 23:59:59';
    }

    // Add ordering
    $sql .= " ORDER BY al.created_at DESC";

    // If exporting all data, don't apply pagination
    if ($export_all) {
        $logs = $db->fetchAll($sql, $params);
        
        echo json_encode([
            'success' => true,
            'data' => $logs,
            'total_records' => count($logs)
        ]);
    } else {
        // Count total rows for pagination
        $count_sql = "SELECT COUNT(*) AS total FROM ($sql) AS sub";
        $total_result = $db->fetchAll($count_sql, $params);
        $total_rows = $total_result[0]['total'] ?? 0;
        $total_pages = ceil($total_rows / $limit);

        // Add limit/offset for pagination
        $sql .= " LIMIT $limit OFFSET $offset";

        $logs = $db->fetchAll($sql, $params);

        echo json_encode([
            'success' => true,
            'data' => $logs,
            'total_pages' => $total_pages,
            'current_page' => $page,
            'total_records' => $total_rows
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}