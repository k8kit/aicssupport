<?php
require_once 'config.php';
require_once '../vendor/autoload.php'; // PHPMailer autoload

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $email = sanitizeInput($input['email'] ?? '');
    
    if (!validateEmail($email)) {
        sendResponse(false, null, 'Invalid email format');
    }

    $db = new Database();
    
    // Find applications for this email
    $applications = $db->fetchAll("
        SELECT 
            reference_no, 
            client_full_name, 
            beneficiary_full_name,
            status,
            a.created_at,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE email = ? 
        ORDER BY a.created_at DESC
    ", [$email]);

    if (empty($applications)) {
        sendResponse(false, null, 'No applications found for this email address');
    }

    // Send email with reference numbers
    $emailSent = sendReferenceEmail($email, $applications);
    
    if ($emailSent) {
        sendResponse(true, null, 'Reference numbers sent to your email address');
    } else {
        sendResponse(false, null, 'Failed to send email. Please try again later.');
    }

} catch (Exception $e) {
    error_log("Forgot Reference API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to process request');
}

function sendReferenceEmail($email, $applications) {
    try {
        $mail = new PHPMailer(true);

        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = '';
        $mail->Password   = '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('noreply@aics-portal.gov.ph', 'AICS Portal');
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'AICS Application Reference Numbers';
        
        $emailBody = generateEmailTemplate($applications);
        $mail->Body = $emailBody;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email sending error: " . $e->getMessage());
        return false;
    }
}

function generateEmailTemplate($applications) {
    $applicationsHtml = '';
    
    foreach ($applications as $app) {
        $statusClass = getEmailStatusClass($app['status']);
        $applicationsHtml .= "
            <tr>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>{$app['reference_no']}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>{$app['service_name']}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>{$app['beneficiary_full_name']}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>
                    <span style='background: {$statusClass['bg']}; color: {$statusClass['color']}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;'>
                        {$app['status']}
                    </span>
                </td>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>" . date('M d, Y', strtotime($app['created_at'])) . "</td>
            </tr>
        ";
    }

    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>AICS Reference Numbers</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4;'>
        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1);'>
            <div style='background: linear-gradient(135deg, #0d6efd 0%, #0d5aa7 100%); color: white; padding: 30px; text-align: center;'>
                <h1 style='margin: 0; font-size: 24px;'>AICS Portal</h1>
                <p style='margin: 10px 0 0 0; opacity: 0.9;'>Application Reference Numbers</p>
            </div>
            
            <div style='padding: 30px;'>
                <p>Dear Applicant,</p>
                <p>Here are your AICS application reference numbers:</p>
                
                <table style='width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>
                    <thead>
                        <tr style='background: #f8f9fa;'>
                            <th style='padding: 15px 12px; text-align: left; font-weight: bold; color: #495057;'>Reference No.</th>
                            <th style='padding: 15px 12px; text-align: left; font-weight: bold; color: #495057;'>Service</th>
                            <th style='padding: 15px 12px; text-align: left; font-weight: bold; color: #495057;'>Beneficiary</th>
                            <th style='padding: 15px 12px; text-align: left; font-weight: bold; color: #495057;'>Status</th>
                            <th style='padding: 15px 12px; text-align: left; font-weight: bold; color: #495057;'>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$applicationsHtml}
                    </tbody>
                </table>
                
                <div style='background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 15px; margin: 20px 0;'>
                    <p style='margin: 0; color: #0c5460;'>
                        <strong>Track Your Applications:</strong> Visit our tracking page and enter your reference number to check the current status of your applications.
                    </p>
                </div>
                
                <p>If you have any questions, please contact our office.</p>
                <p>Best regards,<br>AICS Portal Team</p>
            </div>
            
            <div style='background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;'>
                <p style='margin: 0;'>This is an automated message. Please do not reply to this email.</p>
                <p style='margin: 5px 0 0 0;'>&copy; 2025 AICS Support Team. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
}

function getEmailStatusClass($status) {
    $statusClasses = [
        'Pending for approval' => ['bg' => '#fff3cd', 'color' => '#856404'],
        'Approved' => ['bg' => '#d1e7dd', 'color' => '#0f5132'],
        'Rejected' => ['bg' => '#f8d7da', 'color' => '#721c24'],
        'Waiting for approval of heads/city mayor' => ['bg' => '#d1ecf1', 'color' => '#0c5460'],
        'Ready for release' => ['bg' => '#d4edda', 'color' => '#155724']
    ];
    
    return $statusClasses[$status] ?? ['bg' => '#e9ecef', 'color' => '#495057'];
}
?>
