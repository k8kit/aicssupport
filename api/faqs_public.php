<?php
/**
 * Public API endpoint for displaying FAQs on homepage
 * No authentication required
 */
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $db = new Database();

    // Only fetch active FAQs
    $faqs = $db->fetchAll(
        "SELECT 
            id,
            question,
            answer,
            category,
            display_order
         FROM faqs 
         WHERE is_active = 1
         ORDER BY category ASC, display_order ASC, created_at ASC"
    );

    // Group FAQs by category
    $groupedFaqs = [];
    foreach ($faqs as $faq) {
        $category = $faq['category'];
        if (!isset($groupedFaqs[$category])) {
            $groupedFaqs[$category] = [];
        }
        $groupedFaqs[$category][] = $faq;
    }

    sendResponse(true, [
        'faqs' => $faqs,
        'grouped' => $groupedFaqs
    ]);

} catch (Exception $e) {
    error_log('FAQs Public API Error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to load FAQs');
}
?>