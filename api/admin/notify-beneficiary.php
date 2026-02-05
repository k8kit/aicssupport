<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';
require_once '../../vendor/autoload.php'; // PHPMailer autoload

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    checkAdminAuth(['admin']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $applicationId = $input['application_id'] ?? '';
    $email = $input['email'] ?? '';

    if (empty($applicationId) || empty($email)) {
        sendResponse(false, null, 'Application ID and email are required');
    }

    $db = new Database();
    
    // Get application details
    $application = $db->fetchOne("
        SELECT 
            a.reference_no,
            a.beneficiary_full_name,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.id = ?
    ", [$applicationId]);

    if (!$application) {
        sendResponse(false, null, 'Application not found');
    }

    // Send notification email
    $emailSent = sendBeneficiaryNotification($email, $application);
    
    if ($emailSent) {
        sendResponse(true, null, 'Notification sent successfully');
    } else {
        sendResponse(false, null, 'Failed to send notification email');
    }

} catch (Exception $e) {
    error_log("Notify Beneficiary API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to send notification');
}

function sendBeneficiaryNotification($email, $application) {
    try {
        $mail = new PHPMailer(true);

        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = ' ';
        $mail->Password   = 'byqp mxoc qcwz ekua';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('noreply@aics-portal.gov.ph', 'AICS Portal');
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'AICS Assistance Ready for Release';
        
        $emailBody = generateNotificationTemplate($application);
        $mail->Body = $emailBody;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email sending error: " . $e->getMessage());
        return false;
    }
}

function generateNotificationTemplate($application) {
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>AICS Assistance Ready</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4;'>
        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1);'>
            <div style='background: linear-gradient(135deg, #198754 0%, #157347 100%); color: white; padding: 30px; text-align: center;'>
                <h1 style='margin: 0; font-size: 24px;'>AICS Portal</h1>
                <p style='margin: 10px 0 0 0; opacity: 0.9;'>Assistance Ready for Release</p>
            </div>
            
            <div style='padding: 30px;'>
                <p>Dear {$application['beneficiary_full_name']},</p>
                <p>We are pleased to inform you that your AICS assistance application has been approved and is now ready for release.</p>
                
                <div style='background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin: 20px 0;'>
                    <h3 style='margin: 0 0 10px 0; color: #0c5460;'>Application Details</h3>
                    <p style='margin: 5px 0;'><strong>Reference Number:</strong> {$application['reference_no']}</p>
                    <p style='margin: 5px 0;'><strong>Service Type:</strong> {$application['service_name']}</p>
                    <p style='margin: 5px 0;'><strong>Beneficiary:</strong> {$application['beneficiary_full_name']}</p>
                </div>
                
                <div style='background: #d1e7dd; border: 1px solid #badbcc; border-radius: 8px; padding: 15px; margin: 20px 0;'>
                    <p style='margin: 0; color: #0f5132;'>
                        <strong>Next Steps:</strong> Please visit our office during business hours to claim your assistance. Bring a valid ID and this reference number.
                    </p>
                </div>
                
                <p>If you have any questions, please contact our office.</p>
                <p>Best regards,<br>AICS City of Sto. Tomas</p>
            </div>
            
            <div style='background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;'>
                <p style='margin: 0;'>This is an automated message. Please do not reply to this email.</p>
                <p style='margin: 5px 0 0 0;'>&copy; 2025 AICS City of Sto. Tomas. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
}
?>
