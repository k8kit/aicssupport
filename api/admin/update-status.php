<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    checkAdminAuth(['admin', 'approver', 'citymayor']);

    $input = json_decode(file_get_contents('php://input'), true);
    $applicationId = $input['application_id'] ?? '';
    $status = $input['status'] ?? '';
    $action = $input['action'] ?? '';

    $scheduleDate = $input['schedule_date'] ?? null;
    $scheduleTime = $input['schedule_time'] ?? null;

    if (empty($applicationId) || empty($status)) {
        sendResponse(false, null, 'Application ID and status are required');
    }

    $db = new Database();
    $currentUser = getCurrentUser();
    $userRole = $currentUser['role'];

    // ✅ Define allowed transitions per role
    $allowedTransitions = [ 
        'admin' => [
            'Pending for approval' => ['approved', 'rejected', 'waiting_head'],
            'Approved' => ['waiting_head', 'rejected'],
            'Ready for release' => ['released']
        ],
        'approver' => [
            'Waiting for approval of head' => ['waiting_mayor', 'rejected']
        ],
        'citymayor' => [
            'Waiting for approval of city mayor' => ['ready', 'rejected']
        ]
    ];

    // ✅ Map shorthand statuses to full ENUM values
    $statusMap = [
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'waiting_head' => 'Waiting for approval of head',
        'waiting_mayor' => 'Waiting for approval of city mayor',
        'ready' => 'Ready for release',
        'released' => 'Released'
    ];

    $newStatus = $statusMap[$status] ?? $status;

    // ✅ Get current application status
    $currentApp = $db->fetchOne("SELECT status FROM applications WHERE id = ?", [$applicationId]);
    if (!$currentApp) {
        sendResponse(false, null, 'Application not found');
    }
    $currentStatus = $currentApp['status'];

    // ✅ Validate transition
    if (!isset($allowedTransitions[$userRole][$currentStatus]) ||
        !in_array($status, $allowedTransitions[$userRole][$currentStatus])) {
        sendResponse(false, null, "Invalid status transition for your role ($userRole)");
    }

    // ✅ Handle scheduling for interview approval
    if ($status === 'approved' && !empty($scheduleDate) && !empty($scheduleTime)) {
        $department = $_SESSION['department'] ?? null;

        // Check if slot already booked
        $existing = $db->fetchOne("
            SELECT a.id 
            FROM applications a
            INNER JOIN programs p ON a.service_type = p.id
            WHERE p.department = ? AND a.interview_date = ? AND a.interview_time = ?
        ", [$department, $scheduleDate, $scheduleTime]);

        if ($existing) {
            sendResponse(false, null, 'This interview slot is already booked. Please choose another time.');
        }

        $db->query("
            UPDATE applications 
            SET status = ?, interview_date = ?, interview_time = ?, updated_at = NOW()
            WHERE id = ?
        ", [$newStatus, $scheduleDate, $scheduleTime, $applicationId]);

        // Send interview email
        require_once 'send_email.php';
        $applicant = $db->fetchOne("
            SELECT a.client_full_name, a.email, p.department
            FROM applications a
            LEFT JOIN programs p ON a.service_type = p.id
            WHERE a.id = ?
        ", [$applicationId]);

        if ($applicant && !empty($applicant['email'])) {
            sendInterviewEmail(
                $applicant['email'],
                $applicant['client_full_name'],
                $scheduleDate,
                $scheduleTime,
                $applicant['department']
            );
        }
    } else {
        $reason = $input['reason'] ?? null;

        $db->query("
            UPDATE applications 
            SET status = ?, updated_at = NOW()
            WHERE id = ?
        ", [$newStatus, $applicationId]);

        if ($status === 'rejected' && !empty($reason)) {
            require_once 'send_email.php';

            $applicant = $db->fetchOne("
                SELECT client_full_name, email
                FROM applications
                WHERE id = ?
            ", [$applicationId]);

            if ($applicant && !empty($applicant['email'])) {
                sendRejectionEmail($applicant['email'], $applicant['client_full_name'], $reason);
            }
        }
    }

    // ✅ Log activity
    $actionDescriptions = [
        'approved' => 'Application approved for interview',
        'waiting_head' => 'Application forwarded to department head',
        'waiting_mayor' => 'Application forwarded to city mayor',
        'ready' => 'Application approved for release',
        'released' => 'Assistance released',
        'rejected' => 'Application rejected'
    ];

    $description = $actionDescriptions[$status] ?? "Status updated to $newStatus";

    logActivity($currentUser['id'], 'status_update', $description, $applicationId);

    sendResponse(true, null, 'Application status updated successfully');

} catch (Exception $e) {
    error_log("Update Status API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to update application status');
}
?>
