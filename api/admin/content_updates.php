<?php
session_start();
header('Content-Type: application/json');

require_once '../config.php';
require_once 'auth-middleware.php';

checkAdminAuth(['admin']);
$currentUser = getCurrentUser();
$admin_id = $currentUser['id'];

try {
    $db = new Database();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGetRequest($db);
            break;
        case 'POST':
            handlePostRequest($db, $admin_id);
            break;
        case 'DELETE':
            handleDeleteRequest($db);
            break;
        default:
            sendResponse(false, null, 'Method not allowed');
    }

} catch (Exception $e) {
    error_log('Content Updates API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to process request');
}

/**
 * Handle GET requests - Fetch content
 */
function handleGetRequest($db) {
    try {
        // Get single content by ID
        if (isset($_GET['id'])) {
            $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
            
            if (!$id) {
                sendResponse(false, null, 'Invalid ID');
            }

            $content = $db->fetchOne(
                "SELECT * FROM content_updates WHERE id = ?",
                [$id]
            );

            if ($content) {
                sendResponse(true, $content);
            } else {
                sendResponse(false, null, 'Content not found');
            }
            return;
        }

        // Get all content updates with admin info
        $contents = $db->fetchAll("
            SELECT 
                cu.*,
                a.full_name as created_by_name,
                DATE_FORMAT(cu.created_at, '%M %d, %Y %h:%i %p') as formatted_date
            FROM content_updates cu
            LEFT JOIN admin_users a ON cu.created_by = a.id
            ORDER BY cu.display_order ASC, cu.created_at DESC
        ");

        sendResponse(true, $contents);

    } catch (Exception $e) {
        error_log('GET Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to fetch content');
    }
}

/**
 * Handle POST requests - Create or Update content
 */
function handlePostRequest($db, $admin_id) {
    try {
        // Collect POST data
        $title = sanitizeInput($_POST['title'] ?? '');
        $description = sanitizeInput($_POST['description'] ?? '');
        $displayOrder = filter_var($_POST['display_order'] ?? 0, FILTER_VALIDATE_INT);
        $isActive = isset($_POST['is_active']) ? 1 : 0;
        
        // Validation
        if (empty($title)) {
            sendResponse(false, null, 'Title is required');
        }
        
        if (empty($description)) {
            sendResponse(false, null, 'Description is required');
        }

        if (strlen($title) > 255) {
            sendResponse(false, null, 'Title is too long (max 255 characters)');
        }

        // Check if updating existing content
        $contentId = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;

        // Get old image path if updating
        $oldImagePath = null;
        if ($contentId) {
            $oldData = $db->fetchOne("SELECT image_path FROM content_updates WHERE id = ?", [$contentId]);
            $oldImagePath = $oldData['image_path'] ?? null;
        }

        $newImagePath = $oldImagePath; // default to existing one

        // File upload handling
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../uploads/updates';
            createDirectory($uploadDir);

            // Validate file
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $maxSize = 5 * 1024 * 1024; // 5MB

            // Get real MIME type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $_FILES['image']['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $allowedTypes)) {
                sendResponse(false, null, 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.');
            }

            if ($_FILES['image']['size'] > $maxSize) {
                sendResponse(false, null, 'File size exceeds 5MB limit');
            }

            // Generate unique filename
            $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $newFileName = 'content_' . time() . '_' . uniqid() . '.' . strtolower($extension);
            $uploadPath = $uploadDir . '/' . $newFileName;

            // If an old image exists and it's different, delete it
            if (!empty($oldImagePath)) {
                $oldFilePath = '../../' . $oldImagePath;
                if (file_exists($oldFilePath)) {
                    unlink($oldFilePath);
                }
            }

            // Save new file
            if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
                sendResponse(false, null, 'Failed to upload image');
            }

            // Save relative path for DB
            $newImagePath = 'uploads/updates/' . $newFileName;
        } elseif (!$contentId) {
            // Image is required for new content
            sendResponse(false, null, 'Image is required for new content');
        }

        if ($contentId) {
            // UPDATE existing content
            $params = [$title, $description, $displayOrder, $isActive];
            $sql = "UPDATE content_updates SET title=?, description=?, display_order=?, is_active=?";

            // Update image path if new file uploaded
            if ($newImagePath && $newImagePath !== $oldImagePath) {
                $sql .= ", image_path=?";
                $params[] = $newImagePath;
            }

            $sql .= " WHERE id=?";
            $params[] = $contentId;

            $db->query($sql, $params);

            if (function_exists('logActivity')) {
                logActivity($admin_id, "Update Content", "Updated content: $title");
            }

            sendResponse(true, ['id' => $contentId], 'Content updated successfully');

        } else {
            // INSERT new content
            $db->query("
                INSERT INTO content_updates 
                (title, description, image_path, display_order, is_active, created_by) 
                VALUES (?, ?, ?, ?, ?, ?)
            ", [
                $title, 
                $description, 
                $newImagePath, 
                $displayOrder, 
                $isActive, 
                $admin_id
            ]);

            $newId = $db->getLastInsertId();

            if (function_exists('logActivity')) {
                logActivity($admin_id, "Create Content", "Created new content: $title");
            }

            sendResponse(true, ['id' => $newId], 'Content created successfully');
        }

    } catch (Exception $e) {
        error_log('POST Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to save content: ' . $e->getMessage());
    }
}

/**
 * Handle DELETE requests - Delete content
 */
function handleDeleteRequest($db) {
    try {
        $id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
        
        if (!$id) {
            sendResponse(false, null, 'Invalid ID');
        }

        // Get image path before deleting
        $content = $db->fetchOne(
            "SELECT image_path, title FROM content_updates WHERE id = ?",
            [$id]
        );

        if (!$content) {
            sendResponse(false, null, 'Content not found');
        }

        // Delete from database
        $db->query("DELETE FROM content_updates WHERE id = ?", [$id]);

        // Delete image file if exists
        if ($content['image_path']) {
            $filePath = '../../' . $content['image_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $currentUser = getCurrentUser();
        if (function_exists('logActivity')) {
            logActivity($currentUser['id'], "Delete Content", "Deleted content: " . $content['title']);
        }

        sendResponse(true, null, 'Content deleted successfully');

    } catch (Exception $e) {
        error_log('DELETE Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to delete content');
    }
}
?>