<?php
require_once 'config.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    error_log("Apply.php started - Method: " . $_SERVER['REQUEST_METHOD']);
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $db = new Database();
    error_log("Database connected successfully");
    
    // Validate required fields
    $requiredFields = [
        'client_first_name', 'client_last_name', 'client_sex', 'client_dob',
        'client_address', 'relationship_to_beneficiary', 'civil_status',
        'beneficiary_first_name', 'beneficiary_last_name', 'beneficiary_sex',
        'beneficiary_dob', 'beneficiary_address', 'beneficiary_civil_status',
        'category', 'email', 'service_type'
    ];

    error_log("Validating required fields...");
    foreach ($requiredFields as $field) {
        if (empty($_POST[$field])) {
            error_log("Missing required field: " . $field);
            sendResponse(false, null, "Field '$field' is required");
        }
    }

    // Validate email
    if (!validateEmail($_POST['email'])) {
        error_log("Invalid email format: " . $_POST['email']);
        sendResponse(false, null, 'Invalid email format');
    }

    // Generate unique reference number
    error_log("Generating reference number...");
    do {
        $referenceNumber = generateReferenceNumber();
        $existing = $db->fetchOne("SELECT id FROM applications WHERE reference_no = ?", [$referenceNumber]);
    } while ($existing);
    
    error_log("Generated reference number: " . $referenceNumber);
    
    // Handle file organization BEFORE inserting application
    $finalUploadedFiles = [];
    
    error_log("POST data - uploaded_files: " . (isset($_POST['uploaded_files']) ? 'YES' : 'NO'));
    error_log("POST data - temp_reference_no: " . (isset($_POST['temp_reference_no']) ? $_POST['temp_reference_no'] : 'NO'));
    
    if (isset($_POST['uploaded_files']) && isset($_POST['temp_reference_no'])) {
        $uploadedFiles = json_decode($_POST['uploaded_files'], true);
        $tempReferenceNo = $_POST['temp_reference_no'];
        
        error_log("Uploaded files JSON: " . $_POST['uploaded_files']);
        error_log("Temp reference: " . $tempReferenceNo);
        error_log("Decoded files count: " . (is_array($uploadedFiles) ? count($uploadedFiles) : 'NOT_ARRAY'));
        
        if ($uploadedFiles && is_array($uploadedFiles) && !empty($tempReferenceNo)) {
            $tempFolder = __DIR__ . '/../uploads/' . $tempReferenceNo;
            $finalFolder = __DIR__ . '/../uploads/' . $referenceNumber;
            
            error_log("Temp folder path: " . $tempFolder);
            error_log("Final folder path: " . $finalFolder);
            error_log("Temp folder exists: " . (is_dir($tempFolder) ? 'YES' : 'NO'));
            
            try {
                // Create final directory
                if (!is_dir($finalFolder)) {
                    if (!mkdir($finalFolder, 0755, true)) {
                        throw new Exception("Failed to create final directory: " . $finalFolder);
                    }
                    error_log("Created final directory: " . $finalFolder);
                } else {
                    error_log("Final directory already exists: " . $finalFolder);
                }
                
                foreach ($uploadedFiles as $file) {
                    // Check if file has path - if not, skip it
                    if (!isset($file['path']) || empty($file['path'])) {
                        error_log("File missing path, skipping: " . json_encode($file));
                        continue;
                    }
                    
                    $tempFilePath = __DIR__ . '/../' . $file['path'];
                    $filename = basename($file['path']);
                    $finalFilePath = $finalFolder . '/' . $filename;
                    
                    error_log("Processing file: " . $filename);
                    error_log("Temp file path: " . $tempFilePath);
                    error_log("Final file path: " . $finalFilePath);
                    error_log("Temp file exists: " . (file_exists($tempFilePath) ? 'YES' : 'NO'));
                    
                    // Move file from temp folder to final folder
                    if (file_exists($tempFilePath)) {
                        if (rename($tempFilePath, $finalFilePath)) {
                            // Update file path for database
                            $file['path'] = 'uploads/' . $referenceNumber . '/' . $filename;
                            $finalUploadedFiles[] = $file;
                            error_log("File moved successfully: " . $filename);
                        } else {
                            error_log("Failed to move file: " . $filename . " - " . error_get_last()['message']);
                        }
                    } else {
                        error_log("Temp file not found: " . $tempFilePath);
                    }
                }
                
                // Clean up temp folder if it exists and is empty
                if (is_dir($tempFolder)) {
                    $remainingFiles = glob($tempFolder . '/*');
                    if (empty($remainingFiles)) {
                        rmdir($tempFolder);
                        error_log("Removed empty temp directory: " . $tempFolder);
                    } else {
                        error_log("Temp directory not empty, keeping: " . count($remainingFiles) . " files");
                    }
                }
                
            } catch (Exception $e) {
                error_log("Error organizing files: " . $e->getMessage());
                // Continue with application submission even if file moving fails
            }
        }
    } else {
        error_log("No files to process or missing temp reference");
    }

    error_log("Final uploaded files count: " . count($finalUploadedFiles));
    $clientFirstName = sanitizeInput(trim($_POST['client_first_name']));
    $clientLastName = sanitizeInput(trim($_POST['client_last_name']));
    $clientMiddleName = sanitizeInput(trim($_POST['client_middle_name'] ?? ''));
    $clientExtension = sanitizeInput(trim($_POST['client_extension'] ?? ''));
    
    // Prepare beneficiary name components
    $beneficiaryFirstName = sanitizeInput(trim($_POST['beneficiary_first_name']));
    $beneficiaryLastName = sanitizeInput(trim($_POST['beneficiary_last_name']));
    $beneficiaryMiddleName = sanitizeInput(trim($_POST['beneficiary_middle_name'] ?? ''));
    $beneficiaryExtension = sanitizeInput(trim($_POST['beneficiary_extension'] ?? ''));
    
    // Create full names for display purposes (optional, if you keep full_name columns)
    $clientFullName = trim($clientFirstName . ' ' . $clientMiddleName . ' ' . $clientLastName . ' ' . $clientExtension);
    $beneficiaryFullName = trim($beneficiaryFirstName . ' ' . $beneficiaryMiddleName . ' ' . $beneficiaryLastName . ' ' . $beneficiaryExtension);

    // Prepare application data
    error_log("Preparing application data...");
    $applicationData = [
        $referenceNumber,                                           // 1. reference_no
        $clientFullName,                                           // 2. client_full_name
        $clientLastName,                                           // 3. client_last_name
        $clientFirstName,                                          // 4. client_first_name
        $clientMiddleName,                                         // 5. client_middle_name
        $clientExtension,                                          // 6. client_extension
        sanitizeInput($_POST['client_sex']),                      // 7. client_sex
        $_POST['client_dob'],                                     // 8. client_dob
        sanitizeInput($_POST['client_address']),                  // 9. client_address
        sanitizeInput($_POST['client_place_of_birth'] ?? ''),    // 10. client_place_of_birth
        sanitizeInput($_POST['relationship_to_beneficiary']),     // 11. relationship_to_beneficiary
        sanitizeInput($_POST['civil_status']),                    // 12. civil_status
        sanitizeInput($_POST['religion'] ?? ''),                  // 13. religion
        sanitizeInput($_POST['nationality'] ?? 'Filipino'),       // 14. nationality
        sanitizeInput($_POST['education'] ?? ''),                 // 15. education
        sanitizeInput($_POST['occupation'] ?? ''),                // 16. occupation
        floatval($_POST['monthly_income'] ?? 0),                  // 17. monthly_income
        sanitizeInput($_POST['philhealth_no'] ?? ''),            // 18. philhealth_no
        sanitizeInput($_POST['admission_mode'] ?? 'Online'),    // 19. admission_mode
        sanitizeInput($_POST['referring_party'] ?? ''),          // 20. referring_party
        sanitizeInput($_POST['contact_number'] ?? ''),           // 21. contact_number
        $beneficiaryFullName,                                     // 22. beneficiary_full_name
        $beneficiaryLastName,                                     // 23. beneficiary_last_name
        $beneficiaryFirstName,                                    // 24. beneficiary_first_name
        $beneficiaryMiddleName,                                   // 25. beneficiary_middle_name
        $beneficiaryExtension,                                    // 26. beneficiary_extension
        sanitizeInput($_POST['beneficiary_sex']),                // 27. beneficiary_sex
        $_POST['beneficiary_dob'],                               // 28. beneficiary_dob
        sanitizeInput($_POST['beneficiary_address']),            // 29. beneficiary_address
        sanitizeInput($_POST['beneficiary_place_of_birth'] ?? ''), // 30. beneficiary_place_of_birth
        sanitizeInput($_POST['beneficiary_civil_status']),       // 31. beneficiary_civil_status
        sanitizeInput($_POST['category']),                       // 32. category
        sanitizeInput($_POST['category_id_no'] ?? ''),          // 33. category_id_no
        $_POST['email'],                                         // 34. email
        intval($_POST['service_type']),                          // 35. service_type
        'Pending for approval',                                  // 36. status
        date('Y-m-d H:i:s')                                      // 37. created_at
    ];

    // Insert application
    error_log("Inserting application into database...");
    $sql = "INSERT INTO applications (
        reference_no, client_full_name, client_last_name, client_first_name, 
        client_middle_name, client_extension, client_sex, client_dob, client_address, 
        client_place_of_birth, relationship_to_beneficiary, civil_status, religion, 
        nationality, education, occupation, monthly_income, philhealth_no, 
        admission_mode, referring_party, contact_number, 
        beneficiary_full_name, beneficiary_last_name, beneficiary_first_name, 
        beneficiary_middle_name, beneficiary_extension, beneficiary_sex, 
        beneficiary_dob, beneficiary_address, beneficiary_place_of_birth, 
        beneficiary_civil_status, category, category_id_no, email, service_type, 
        status, created_at 
    ) VALUES (" . str_repeat('?,', count($applicationData) - 1) . "?)";

    error_log("SQL Query: " . $sql);
    
    $stmt = $db->query($sql, $applicationData);
    $applicationId = $db->getLastInsertId();

    if (!$applicationId) {
        throw new Exception("Failed to insert application - no ID returned");
    }
    
    error_log("Application inserted with ID: " . $applicationId);

    // Insert family members
    if (isset($_POST['family_members'])) {
        $familyMembers = json_decode($_POST['family_members'], true);
        error_log("Family members JSON: " . $_POST['family_members']);
        
        if ($familyMembers && is_array($familyMembers)) {
            $familySql = "INSERT INTO family_members (application_id, full_name, sex, birthdate, civil_status, relationship, education, occupation, monthly_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            foreach ($familyMembers as $member) {
                if (!empty($member['name'])) {
                    $familyData = [
                        $applicationId,
                        sanitizeInput($member['name']),
                        sanitizeInput($member['sex'] ?? ''),
                        !empty($member['birthdate']) ? $member['birthdate'] : null,
                        sanitizeInput($member['civil_status'] ?? ''),
                        sanitizeInput($member['relationship'] ?? ''),
                        sanitizeInput($member['education'] ?? ''),
                        sanitizeInput($member['occupation'] ?? ''),
                        floatval($member['income'] ?? 0)
                    ];
                    
                    $db->query($familySql, $familyData);
                    error_log("Added family member: " . $member['name']);
                }
            }
        }
    }

    // Insert uploaded documents (using final file paths)
    if (!empty($finalUploadedFiles)) {
        error_log("Inserting " . count($finalUploadedFiles) . " documents into database...");
        $documentsSql = "INSERT INTO documents (application_id, file_name, file_path, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?)";
        
        foreach ($finalUploadedFiles as $file) {
            $documentData = [
                $applicationId,
                sanitizeInput($file['name']),
                sanitizeInput($file['path']),
                sanitizeInput($file['type']),
                date('Y-m-d H:i:s')
            ];
            
            error_log("Inserting document: " . $file['name'] . " at path: " . $file['path']);
            $db->query($documentsSql, $documentData);
        }
    }
    if (!empty($_POST['signature_data'])) {
        $signatureData = $_POST['signature_data'];

        // Set the folder to uploads/{reference_no}
        $signatureFolder = __DIR__ . '/../uploads/' . $referenceNumber;
        createDirectory($signatureFolder);

        // Save as signature.png (or use a unique name if you prefer)
        $signatureFileName = 'signature.png';
        $signatureFilePath = $signatureFolder . '/' . $signatureFileName;

        // Handle base64 signature data
        if (strpos($signatureData, 'data:image') === 0) {
            $signatureData = str_replace('data:image/png;base64,', '', $signatureData);
            $signatureData = str_replace('data:image/jpeg;base64,', '', $signatureData);
            $signatureData = str_replace(' ', '+', $signatureData);
            $signatureImage = base64_decode($signatureData);

            if ($signatureImage !== false) {
                file_put_contents($signatureFilePath, $signatureImage);
                $signatureDbPath = 'uploads/' . $referenceNumber . '/' . $signatureFileName;

                // Update application with signature path
                $db->query("UPDATE applications SET signature_path = ? WHERE reference_no = ?", 
                    [$signatureDbPath, $referenceNumber]);

                error_log("Signature saved: " . $signatureDbPath);
            } else {
                error_log("Failed to decode signature data");
            }
        }
    } else {
        error_log("No signature data provided");
    }

    // Log success
    error_log("Application submitted successfully with reference: " . $referenceNumber);

    sendResponse(true, ['reference_number' => $referenceNumber], 'Application submitted successfully');

} catch (Exception $e) {
    error_log("Apply API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendResponse(false, null, 'Failed to submit application: ' . $e->getMessage());
}