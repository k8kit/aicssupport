<?php
session_start();
$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email']);
$otp = trim($data['otp']);

if (!isset($_SESSION['email_otp']) || !isset($_SESSION['otp_email'])) {
    echo json_encode(['success' => false, 'message' => 'No OTP session found']);
    exit;
}

if (time() > $_SESSION['otp_expiry']) {
    session_unset();
    echo json_encode(['success' => false, 'message' => 'OTP expired']);
    exit;
}

if ($_SESSION['otp_email'] === $email && $_SESSION['email_otp'] == $otp) {
    unset($_SESSION['email_otp'], $_SESSION['otp_email'], $_SESSION['otp_expiry']);
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid OTP']);
}
?>
