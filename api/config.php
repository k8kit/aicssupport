<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'aics_system');

class Database {
    private $host = DB_HOST;
    private $user = DB_USER;
    private $password = DB_PASS;
    private $database = DB_NAME;
    private $connection;

    public function __construct() {
        $this->connect();
    }



    private function connect() {
        try {
            $this->connection = new mysqli($this->host, $this->user, $this->password, $this->database);
            
            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }
            
            $this->connection->set_charset("utf8mb4");
        } catch (Exception $e) {
            $this->handleError("Database connection failed", $e->getMessage());
        }
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $this->connection->error);
            }

            if (!empty($params)) {
                $types = str_repeat('s', count($params));
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            
            if ($stmt->error) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            return $stmt;
        } catch (Exception $e) {
            $this->handleError("Query execution failed", $e->getMessage());
        }
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        $result = $stmt->get_result();
        $data = [];
        
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function getLastInsertId() {
        return $this->connection->insert_id;
    }

    private function handleError($message, $details = '') {
        // Always convert arrays/objects to JSON for logging
        if (is_array($details) || is_object($details)) {
            $json = json_encode($details, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if ($json !== false) {
                $details = $json;
            } else {
                $details = print_r($details, true);
            }
        }
        // Final catch-all: ensure $details is a string
        if (!is_string($details)) {
            $details = var_export($details, true);
        }
        error_log("Database Error: $message - $details");
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
        exit;
    }

    public function __destruct() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// Utility functions
function generateReferenceNumber() {
    $year = date('Y');
    $month = date('m');
    $timestamp = time();
    $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    return "AICS-{$year}{$month}-{$random}";
}

function sanitizeInput($data) {
    if (is_null($data)) return null;
    
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    return $data;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}

/**
 * Create directory with proper permissions and error handling
 */
function createDirectory($path, $permissions = 0755) {
    if (!is_dir($path)) {
        if (!mkdir($path, $permissions, true)) {
            throw new Exception("Failed to create directory: " . $path);
        }
        
        // Verify directory was created
        if (!is_dir($path)) {
            throw new Exception("Directory creation verification failed: " . $path);
        }
        
        // Set permissions explicitly (in case umask interfered)
        chmod($path, $permissions);
    }
    
    return true;
}

/**
 * Move files safely with error handling
 */
function moveFilesSafely($sourceDir, $targetDir) {
    if (!is_dir($sourceDir)) {
        error_log("Source directory does not exist: " . $sourceDir);
        return [];
    }
    
    createDirectory($targetDir);
    
    $files = glob($sourceDir . '/*');
    $movedFiles = [];
    
    foreach ($files as $file) {
        if (is_file($file)) {
            $filename = basename($file);
            $targetFile = $targetDir . '/' . $filename;
            
            if (rename($file, $targetFile)) {
                $movedFiles[] = $filename;
                error_log("File moved successfully: {$file} to {$targetFile}");
            } else {
                error_log("Failed to move file: {$file} to {$targetFile}");
            }
        }
    }
    
    // Clean up source directory if it's empty
    $remainingFiles = glob($sourceDir . '/*');
    if (empty($remainingFiles)) {
        rmdir($sourceDir);
        error_log("Removed empty temp directory: " . $sourceDir);
    }
    
    return $movedFiles;
}

/**
 * Clean filename for safe storage
 */
function cleanFilename($filename) {
    // Remove path info for security
    $filename = basename($filename);
    
    // Get file extension
    $info = pathinfo($filename);
    $extension = isset($info['extension']) ? $info['extension'] : '';
    $name = isset($info['filename']) ? $info['filename'] : '';
    
    // Clean the name part
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    
    // Limit length
    if (strlen($name) > 50) {
        $name = substr($name, 0, 50);
    }
    
    return $name . ($extension ? '.' . $extension : '');
}

/**
 * Generate secure filename with timestamp and random string
 */
function generateSecureFilename($originalName) {
    $info = pathinfo($originalName);
    $extension = isset($info['extension']) ? strtolower($info['extension']) : '';
    $name = isset($info['filename']) ? $info['filename'] : 'file';
    
    // Clean the name
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    $name = substr($name, 0, 30); // Limit name length
    
    $timestamp = time();
    $randomStr = bin2hex(random_bytes(4));
    
    return $name . '_' . $timestamp . '_' . $randomStr . ($extension ? '.' . $extension : '');
}

/**
 * Validate file type and size
 */
function validateUploadedFile($file, $maxSize = 10485760, $allowedTypes = ['pdf', 'jpg', 'jpeg', 'png']) {
    $errors = [];
    
    // Check if file was uploaded without errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        switch ($file['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errors[] = 'File size exceeds the maximum limit';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errors[] = 'File upload was interrupted';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errors[] = 'No file was uploaded';
                break;
            default:
                $errors[] = 'File upload error occurred';
        }
    }
    
    // Check file size
    if ($file['size'] > $maxSize) {
        $errors[] = 'File size exceeds ' . round($maxSize / 1024 / 1024) . 'MB limit';
    }
    
    // Check file type
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedTypes)) {
        $errors[] = 'File type not allowed. Allowed types: ' . implode(', ', $allowedTypes);
    }
    
    // Additional MIME type check
    $allowedMimes = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png'
    ];
    
    if (isset($allowedMimes[$fileExtension]) && $file['type'] !== $allowedMimes[$fileExtension]) {
        $errors[] = 'File MIME type does not match extension';
    }
    
    return empty($errors) ? true : $errors;
}

// Error handling
set_error_handler(function($severity, $message, $file, $line) {
    error_log("PHP Error: $message in $file on line $line");
    
    if (!(error_reporting() & $severity)) {
        return;
    }
    
    http_response_code(500);
    sendResponse(false, null, 'Internal server error occurred');
});

?>