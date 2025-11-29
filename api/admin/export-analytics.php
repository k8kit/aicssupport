<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-1 month'));
    $toDate = $_GET['to_date'] ?? date('Y-m-d');
    
    // Generate CSV report
    $filename = "AICS_Analytics_Report_{$fromDate}_to_{$toDate}.csv";
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    
    // CSV Headers
    fputcsv($output, [
        'Report Period: ' . $fromDate . ' to ' . $toDate
    ]);
    fputcsv($output, []); // Empty row
    
    $db = new Database();
    
    // Summary statistics
    fputcsv($output, ['SUMMARY STATISTICS']);
    fputcsv($output, ['Metric', 'Value']);
    
    $totalApplications = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) BETWEEN ? AND ?", [$fromDate, $toDate])['count'];
    $totalBeneficiaries = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status IN ('Ready for release', 'Released') AND DATE(updated_at) BETWEEN ? AND ?", [$fromDate, $toDate])['count'];
    $approvalRate = $totalApplications > 0 ? round(($totalBeneficiaries / $totalApplications) * 100, 1) : 0;
    
    fputcsv($output, ['Total Applications', $totalApplications]);
    fputcsv($output, ['Total Beneficiaries', $totalBeneficiaries]);
    fputcsv($output, ['Approval Rate', $approvalRate . '%']);
    
    fputcsv($output, []); // Empty row
    
    // Applications by program
    fputcsv($output, ['APPLICATIONS BY PROGRAM']);
    fputcsv($output, ['Program Name', 'Application Count']);
    
    $programsData = $db->fetchAll("
        SELECT p.name, COUNT(a.id) as count 
        FROM programs p 
        LEFT JOIN applications a ON p.id = a.service_type 
        WHERE DATE(a.created_at) BETWEEN ? AND ?
        GROUP BY p.id, p.name 
        ORDER BY count DESC
    ", [$fromDate, $toDate]);
    
    foreach ($programsData as $program) {
        fputcsv($output, [$program['name'], $program['count']]);
    }
    
    fclose($output);
    exit;

} catch (Exception $e) {
    error_log("Export Analytics API Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error generating report";
}
?>