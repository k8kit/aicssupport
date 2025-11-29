<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

header('Content-Type: application/json');

try {
    checkAdminAuth(['admin']);

    $db = new Database();
    $data = json_decode(file_get_contents("php://input"), true);
    $date = $data['date'] ?? null;
    $time = $data['time'] ?? null;
    $department = $_SESSION['department'] ?? null;

    if (!$date || !$time || !$department) {
        echo json_encode(['success' => false, 'message' => 'Missing required data.']);
        exit;
    }

    // Check if the schedule already exists for that department
    $existing = $db->fetchOne("
        SELECT a.id 
        FROM applications a
        INNER JOIN programs p ON a.service_type = p.id
        WHERE p.department = ? AND a.interview_date = ? AND a.interview_time = ?
    ", [$department, $date, $time]);

    if ($existing) {
        echo json_encode(['success' => false, 'message' => 'This schedule is already booked. Please choose another time.']);
    } else {
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    error_log("Check Schedule Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error checking schedule.']);
}
?>
