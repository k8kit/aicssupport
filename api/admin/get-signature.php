<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin', 'approver', 'citymayor']); // allow all roles
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Not authenticated');
    }

    $userId = $_SESSION['user_id'];

    // ✅ Use your Database class
    $db = new Database();
    $conn = $db->getConnection();

    $stmt = $conn->prepare("SELECT full_name, e_signature FROM admin_users WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result || $result->num_rows === 0) {
        throw new Exception('User not found');
    }

    $user = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'data' => [
            'full_name' => $user['full_name'],
            'signature_path' => $user['e_signature'] ?? null
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
