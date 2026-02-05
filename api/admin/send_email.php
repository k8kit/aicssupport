<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../../vendor/autoload.php'; // Adjust if needed

/**
 * Send an interview email to an applicant.
 */
function sendInterviewEmail($to, $name, $schedule_date, $schedule_time, $department) {
    $mail = new PHPMailer(true);

    try {
        // SMTP Setup
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = ''; // TODO: replace with your email
        $mail->Password = 'byqp mxoc qcwz ekua';   // TODO: use Gmail app password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // From/To
        $mail->setFrom('keithdaniellereyes@gmail.com', 'City of Sto. Tomas AICS Support');
        $mail->addAddress($to, $name);

        // Determine office based on department
        $office = ($department === 'CSWDO')
            ? "City Social Welfare and Development Office (CSWDO), Sto. Tomas City Hall"
            : "Aksyon Bilis Center, Sto. Tomas City Hall";

        $formattedDate = date("F j, Y", strtotime($schedule_date));
        $formattedTime = date("g:i A", strtotime($schedule_time));

        $mail->isHTML(true);
        $mail->Subject = "AICS Application Approved - Interview Schedule";
        $mail->Body = "
            <div style='font-family: Arial, sans-serif;'>
                <p>Dear <strong>{$name}</strong>,</p>
                <p>Your AICS application has been <strong>approved</strong>.</p>
                <p>Please attend your interview as scheduled below:</p>
                <p><strong>Date:</strong> {$formattedDate}<br>
                   <strong>Time:</strong> {$formattedTime}<br>
                   <strong>Office:</strong> {$office}</p>
                <p>Please remember your reference number and arrive on time.</p>
                <p>Thank you,<br>City of Sto. Tomas AICS Support Team</p>
            </div>
        ";
        $mail->AltBody = "Dear {$name}, your interview is scheduled on {$formattedDate} at {$formattedTime} in {$office}.";

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email Error: " . $mail->ErrorInfo);
        return false;
    }
}
function sendRejectionEmail($to, $name, $reason) {
    $mail = new PHPMailer(true);

    try {
        // SMTP Setup
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'keithdaniellereyes@gmail.com'; // same as your interview sender
        $mail->Password = 'byqp mxoc qcwz ekua';          // your Gmail app password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // From/To
        $mail->setFrom('keithdaniellereyes@gmail.com', 'City of Sto. Tomas AICS Support');
        $mail->addAddress($to, $name);

        // Email Content
        $mail->isHTML(true);
        $mail->Subject = "AICS Application Update - Rejected";
        $mail->Body = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <p>Dear <strong>{$name}</strong>,</p>
                <p>We regret to inform you that your <strong>AICS application</strong> has been <span style='color:red;'>rejected</span>.</p>
                <p><strong>Reason:</strong> {$reason}</p>
                <p>If you have any questions or would like to reapply, please contact the City Social Welfare and Development Office (CSWDO).</p>
                <p>Thank you,<br>City of Sto. Tomas AICS Support Team</p>
            </div>
        ";
        $mail->AltBody = "Dear {$name}, your AICS application has been rejected. Reason: {$reason}.";

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Rejection Email Error: " . $mail->ErrorInfo);
        return false;
    }
}
?>
