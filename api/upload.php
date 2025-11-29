<?php
require_once 'config.php';

// Add logging for debugging
error_log("Upload.php called with method: " . $_SERVER['REQUEST_METHOD']);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    if (!isset($_FILES['file'])) {
        sendResponse(false, null, 'No file uploaded');
    }

    $file = $_FILES['file'];
    error_log("File upload details: " . json_encode([
        'name' => $file['name'],
        'size' => $file['size'],
        'type' => $file['type'],
        'error' => $file['error']
    ]));
    
    // Validation using helper function
    $validation = validateUploadedFile($file);
    if ($validation !== true) {
        sendResponse(false, null, implode('; ', $validation));
    }

    // Get reference number (temp or final)
    $referenceNo = $_POST['reference_no'] ?? '';
    if (empty($referenceNo)) {
        sendResponse(false, null, 'Reference number is required for file upload');
    }
    
    error_log("Reference number: " . $referenceNo);
    
    // Create uploads directory structure using helper function
    createDirectory(__DIR__ . '/../uploads');
    $uploadsDir = __DIR__ . '/../uploads/' . $referenceNo;
    createDirectory($uploadsDir);

    // Generate secure filename using helper function
    $filename = generateSecureFilename($file['name']);
    
    $filepath = $uploadsDir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        error_log("Failed to move uploaded file from " . $file['tmp_name'] . " to " . $filepath);
        sendResponse(false, null, 'Failed to save uploaded file');
    }

    // Log success
    error_log("File uploaded successfully: " . $filepath);

    $relativePath = 'uploads/' . $referenceNo . '/' . $filename;
    
    sendResponse(true, [
        'path' => $relativePath,
        'filename' => $filename,
        'original_name' => $file['name'],
        'size' => $file['size'],
        'type' => $file['type'],
        'reference_no' => $referenceNo
    ], 'File uploaded successfully');

} catch (Exception $e) {
    error_log("Upload API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to upload file: ' . $e->getMessage());
}
?>