<?php

$host = 'localhost';
$user = 'root';
$password = '';

try {
    // Connect to MySQL server (without database)
    $pdo = new PDO("mysql:host=$host", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Read and execute the schema file
    $schema = file_get_contents(__DIR__ . '/schema.sql');
    
    if ($schema === false) {
        throw new Exception('Could not read schema.sql file');
    }
    
    // Split statements by semicolon and execute each one
    $statements = array_filter(array_map('trim', explode(';', $schema)));
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Database setup completed successfully'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database setup failed: ' . $e->getMessage()
    ]);
}
?>