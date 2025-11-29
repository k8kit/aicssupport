<?php
/**
 * Test file to diagnose content_updates API issues
 * Place this in your api/ folder and access it via browser
 */

// Start output buffering
ob_start();

echo "=== Content Updates API Test ===\n\n";

// Test 1: Check if config exists
echo "1. Checking config.php...\n";
if (file_exists('config.php')) {
    echo "   ✓ config.php found\n";
    require_once 'config.php';
} else {
    echo "   ✗ config.php NOT found\n";
    die("ERROR: config.php is missing\n");
}

// Test 2: Check database connection
echo "\n2. Testing database connection...\n";
try {
    $db = new Database();
    echo "   ✓ Database connection successful\n";
} catch (Exception $e) {
    echo "   ✗ Database connection failed: " . $e->getMessage() . "\n";
    die();
}

// Test 3: Check if table exists
echo "\n3. Checking content_updates table...\n";
try {
    $result = $db->fetchOne("SHOW TABLES LIKE 'content_updates'");
    if ($result) {
        echo "   ✓ Table exists\n";
    } else {
        echo "   ✗ Table does NOT exist\n";
        echo "   → Run the SQL script to create the table\n";
        die();
    }
} catch (Exception $e) {
    echo "   ✗ Error checking table: " . $e->getMessage() . "\n";
    die();
}

// Test 4: Check table structure
echo "\n4. Checking table structure...\n";
try {
    $columns = $db->fetchAll("DESCRIBE content_updates");
    echo "   ✓ Table has " . count($columns) . " columns:\n";
    foreach ($columns as $col) {
        echo "      - {$col['Field']} ({$col['Type']})\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

// Test 5: Check if uploads directory exists
echo "\n5. Checking uploads directory...\n";
$uploadDir = '../uploads/updates/';
if (is_dir($uploadDir)) {
    echo "   ✓ Directory exists\n";
    if (is_writable($uploadDir)) {
        echo "   ✓ Directory is writable\n";
    } else {
        echo "   ✗ Directory is NOT writable\n";
        echo "   → Run: chmod 755 {$uploadDir}\n";
    }
} else {
    echo "   ✗ Directory does NOT exist\n";
    echo "   → Run: mkdir -p {$uploadDir}\n";
}

// Test 6: Try to fetch content
echo "\n6. Testing content fetch...\n";
try {
    $contents = $db->fetchAll("SELECT * FROM content_updates ORDER BY created_at DESC");
    echo "   ✓ Query successful\n";
    echo "   ✓ Found " . count($contents) . " content item(s)\n";
    
    if (count($contents) > 0) {
        echo "\n   Sample content:\n";
        $sample = $contents[0];
        echo "   - ID: {$sample['id']}\n";
        echo "   - Title: {$sample['title']}\n";
        echo "   - Active: " . ($sample['is_active'] ? 'Yes' : 'No') . "\n";
    }
} catch (Exception $e) {
    echo "   ✗ Query failed: " . $e->getMessage() . "\n";
}

// Test 7: Check auth-middleware
echo "\n7. Checking auth-middleware.php...\n";
if (file_exists('auth-middleware.php')) {
    echo "   ✓ auth-middleware.php found\n";
} else {
    echo "   ✗ auth-middleware.php NOT found\n";
    echo "   → This file is required for admin authentication\n";
}

// Test 8: Test JSON output
echo "\n8. Testing JSON output...\n";
$testData = [
    'success' => true,
    'data' => ['test' => 'value'],
    'message' => 'Test successful'
];
$json = json_encode($testData);
if ($json) {
    echo "   ✓ JSON encoding works\n";
    echo "   Sample: {$json}\n";
} else {
    echo "   ✗ JSON encoding failed\n";
}

echo "\n=== Test Complete ===\n";
echo "\nIf all tests passed, the API should work.\n";
echo "If any tests failed, fix those issues first.\n\n";

// Get the output
$output = ob_get_clean();

// Display as plain text
header('Content-Type: text/plain');
echo $output;
?>