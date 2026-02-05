<?php
session_start();

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;


require '../vendor/autoload.php';

header('Content-Type: application/json');

// Get JSON input
$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email is required.']);
    exit;
}

// Generate OTP and store in session
$otp = rand(100000, 999999);
$_SESSION['email_otp'] = $otp;
$_SESSION['otp_email'] = $email;
$_SESSION['otp_expiry'] = time() + 300; // 5 minutes

// --- Send OTP Email ---
$mail = new PHPMailer(true);

try {
    // SMTP configuration
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com'; // Change if using another mail provider
    $mail->SMTPAuth = true;
    $mail->Username = ' '; // your sender email
    $mail->Password = 'byqp mxoc qcwz ekua';   // your app password (not Gmail login)
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    // Recipients
    $mail->setFrom(' ', 'AICS Support');
    $mail->addAddress($email);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'AICS Application OTP Verification';
    $mail->Body    = "
        <div style='font-family: Arial, sans-serif;'>
            <h2 style='color:#007bff;'>AICS Portal - Email Verification</h2>
            <p>Dear applicant,</p>
            <p>Your One-Time Password (OTP) for verifying your email is:</p>
            <h1 style='letter-spacing:3px;'>$otp</h1>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <p>If you did not initiate this request, please ignore this message.</p>
            <br>
            <p>Thank you,<br><strong>AICS Support Team</strong></p>
        </div>
    ";

    $mail->send();

    echo json_encode([
        'success' => true,
        'message' => 'OTP sent successfully.'
    ]);

} catch (Exception $e) {
    error_log("Mailer Error: " . $mail->ErrorInfo);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send OTP. Please try again later.'
    ]);
}
?>
