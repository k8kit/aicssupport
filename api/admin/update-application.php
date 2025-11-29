<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// --- Session handling ---
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config.php';
require_once 'auth-middleware.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Authentication check
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['application_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Application ID is required']);
    exit();
}

$applicationId = $data['application_id'];

// ✅ AUTO-MERGE CLIENT NAME FIELDS
if (isset($data['client_last_name']) || isset($data['client_first_name']) || 
    isset($data['client_middle_name']) || isset($data['client_extension'])) {
    
    $nameParts = array_filter([
        $data['client_first_name'] ?? '',
        $data['client_middle_name'] ?? '',
        $data['client_last_name'] ?? '',
        $data['client_extension'] ?? ''
    ]);
    
    $data['client_full_name'] = implode(' ', $nameParts);
}

// ✅ AUTO-MERGE BENEFICIARY NAME FIELDS
if (isset($data['beneficiary_last_name']) || isset($data['beneficiary_first_name']) || 
    isset($data['beneficiary_middle_name']) || isset($data['beneficiary_extension'])) {
    
    $nameParts = array_filter([
        $data['beneficiary_last_name'] ?? '',
        $data['beneficiary_first_name'] ?? '',
        $data['beneficiary_middle_name'] ?? '',
        $data['beneficiary_extension'] ?? ''
    ]);
    
    $data['beneficiary_full_name'] = implode(' ', $nameParts);
}

$updateFields = [];
$params = [];

// List of fields allowed for update
$allowedFields = [
    // Section 1: Client / Beneficiary Info
    'client_full_name',
    'client_sex',
    'client_dob',
    'client_place_of_birth',
    'relationship_to_beneficiary',
    'civil_status',
    'client_last_name',
    'contact_number',
    'client_first_name',
    'client_middle_name',
    'client_extension',
    'client_civil_status',
    'client_address',
    'beneficiary_full_name',
    'beneficiary_sex',
    'beneficiary_dob',
    'beneficiary_place_of_birth',
    'relationship_to_client',
    'beneficiary_last_name',
    'beneficiary_first_name',
    'beneficiary_middle_name',
    'beneficiary_extension',
    'beneficiary_civil_status',
    'beneficiary_address',
    'occupation',
    'admission_mode',
    'monthly_income',
    'religion',
    'nationality',
    'education',
    'philhealth_no',
    'referring_party',
    'contact_number',
    'payee_name',
    'payee_address',

    // Section 2: Assessment & Service
    'problems_presented',
    'social_worker_assessment',
    'client_category',
    'client_subcategory',
    'service_type_nature',
    'financial_type',
    'material_assistance',
    'recommended_assistance',

    // Section 3: Assistance details
    'assistance_amount',
    'assistance_subtotal',
    'assistance_mode',
    'assistance_source',
    'transport_mode',

    // Section 4: Others specify fields
    'financial_others_specify',
    'material_others_specify',
    'service_nature_others_specify',
    'service_nature_referral_specify',
    'assistance_source_others_specify'
];

foreach ($allowedFields as $field) {
    if (isset($data[$field])) {
        $updateFields[] = "$field = ?";
        $params[] = $data[$field];
    }
}

if (empty($updateFields)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No valid fields to update']);
    exit();
}

// Add timestamp to updateFields (no parameter needed)
$updateFields[] = 'updated_at = NOW()';

// Add applicationId to params (for WHERE clause)
$params[] = $applicationId;

$sql = "UPDATE applications SET " . implode(', ', $updateFields) . " WHERE id = ?";

try {
    $db = new Database();
    $db->query($sql, $params);

    echo json_encode([
        'success' => true,
        'message' => 'Application updated successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>