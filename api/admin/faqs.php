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
            handleDeleteRequest($db, $admin_id);
            break;
        default:
            sendResponse(false, null, 'Method not allowed');
    }

} catch (Exception $e) {
    error_log('FAQs API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to process request');
}

/**
 * Handle GET requests - Fetch FAQs
 */
function handleGetRequest($db) {
    try {
        // Get single FAQ by ID
        if (isset($_GET['id'])) {
            $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
            
            if (!$id) {
                sendResponse(false, null, 'Invalid ID');
            }

            $faq = $db->fetchOne(
                "SELECT * FROM faqs WHERE id = ?",
                [$id]
            );

            if ($faq) {
                sendResponse(true, $faq);
            } else {
                sendResponse(false, null, 'FAQ not found');
            }
            return;
        }

        // Get all FAQs with admin info
        $faqs = $db->fetchAll("
            SELECT 
                f.*,
                a.full_name as created_by_name,
                DATE_FORMAT(f.created_at, '%M %d, %Y %h:%i %p') as formatted_date
            FROM faqs f
            LEFT JOIN admin_users a ON f.created_by = a.id
            ORDER BY f.category ASC, f.display_order ASC, f.created_at DESC
        ");

        sendResponse(true, $faqs);

    } catch (Exception $e) {
        error_log('GET Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to fetch FAQs');
    }
}

/**
 * Handle POST requests - Create or Update FAQ
 */
function handlePostRequest($db, $admin_id) {
    try {
        // Collect POST data
        $question = sanitizeInput($_POST['question'] ?? '');
        $answer = sanitizeInput($_POST['answer'] ?? '');
        $category = sanitizeInput($_POST['category'] ?? 'General');
        $displayOrder = filter_var($_POST['display_order'] ?? 0, FILTER_VALIDATE_INT);
        $isActive = isset($_POST['is_active']) ? 1 : 0;
        
        // Validation
        if (empty($question)) {
            sendResponse(false, null, 'Question is required');
        }
        
        if (empty($answer)) {
            sendResponse(false, null, 'Answer is required');
        }

        if (strlen($question) > 500) {
            sendResponse(false, null, 'Question is too long (max 500 characters)');
        }

        // Check if updating existing FAQ
        $faqId = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;

        if ($faqId) {
            // UPDATE existing FAQ
            $db->query("
                UPDATE faqs 
                SET question=?, answer=?, category=?, display_order=?, is_active=?
                WHERE id=?
            ", [
                $question, 
                $answer, 
                $category, 
                $displayOrder, 
                $isActive, 
                $faqId
            ]);

            if (function_exists('logActivity')) {
                logActivity($admin_id, "Update FAQ", "Updated FAQ: $question");
            }

            sendResponse(true, ['id' => $faqId], 'FAQ updated successfully');

        } else {
            // INSERT new FAQ
            $db->query("
                INSERT INTO faqs 
                (question, answer, category, display_order, is_active, created_by) 
                VALUES (?, ?, ?, ?, ?, ?)
            ", [
                $question, 
                $answer, 
                $category, 
                $displayOrder, 
                $isActive, 
                $admin_id
            ]);

            $newId = $db->getLastInsertId();

            if (function_exists('logActivity')) {
                logActivity($admin_id, "Create FAQ", "Created new FAQ: $question");
            }

            sendResponse(true, ['id' => $newId], 'FAQ created successfully');
        }

    } catch (Exception $e) {
        error_log('POST Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to save FAQ: ' . $e->getMessage());
    }
}

/**
 * Handle DELETE requests - Delete FAQ
 */
function handleDeleteRequest($db, $admin_id) {
    try {
        $id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
        
        if (!$id) {
            sendResponse(false, null, 'Invalid ID');
        }

        // Get FAQ info before deleting
        $faq = $db->fetchOne(
            "SELECT question FROM faqs WHERE id = ?",
            [$id]
        );

        if (!$faq) {
            sendResponse(false, null, 'FAQ not found');
        }

        // Delete from database
        $db->query("DELETE FROM faqs WHERE id = ?", [$id]);

        if (function_exists('logActivity')) {
            logActivity($admin_id, "Delete FAQ", "Deleted FAQ: " . $faq['question']);
        }

        sendResponse(true, null, 'FAQ deleted successfully');

    } catch (Exception $e) {
        error_log('DELETE Request Error: ' . $e->getMessage());
        sendResponse(false, null, 'Failed to delete FAQ');
    }
}
?>