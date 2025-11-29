<?php
session_start();
require_once '../config.php';

try {

    $db = new Database();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':

            // ✅ Get logged-in user's department (if any)
            $department = $_SESSION['department'] ?? null;

            // Filters
            $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $toDate = $_GET['to_date'] ?? date('Y-m-d');
            $programId = $_GET['program_id'] ?? '';
            $status = $_GET['status'] ?? '';

            // Build WHERE clause with department join
            $whereConditions = ["DATE(applications.updated_at) BETWEEN ? AND ?"];
            $params = [$fromDate, $toDate];

            if ($programId) {
                $whereConditions[] = "applications.service_type = ?";
                $params[] = $programId;
            }

            if ($status) {
                if ($status === 'Pending') {
                    // All statuses except Released and Rejected
                    $whereConditions[] = "applications.status NOT IN ('Released', 'Rejected')";
                } elseif ($status === 'Released') {
                    $whereConditions[] = "applications.status = 'Released'";
                } elseif ($status === 'Rejected') {
                    $whereConditions[] = "applications.status = 'Rejected'";
                }
            }

            if ($department) {
                $whereConditions[] = "programs.department = ?";
                $params[] = $department;
            }

            $whereClause = implode(' AND ', $whereConditions);

            // --- TOTAL APPLICATIONS ---
            $totalApplications = $db->fetchOne("
                SELECT COUNT(*) AS count 
                FROM applications
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE $whereClause
            ", $params)['count'];

            // --- TOTAL BENEFICIARIES ---
            $totalBeneficiaries = $db->fetchOne("
                SELECT COUNT(*) AS count 
                FROM applications
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE applications.status IN ('Released')
                AND $whereClause
            ", $params)['count'];

            // --- APPROVAL RATE ---
            $approvalRate = $totalApplications > 0 
                ? round(($totalBeneficiaries / $totalApplications) * 100, 1)
                : 0;

            // --- AVERAGE PROCESSING TIME ---
            $avgProcessingTime = $db->fetchOne("
                SELECT AVG(DATEDIFF(applications.updated_at, applications.created_at)) AS avg_days
                FROM applications
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE applications.status IN ('Released')
                AND $whereClause
            ", $params)['avg_days'] ?? 0;

            $trendsData = $db->fetchAll("
                SELECT 
                    DATE_FORMAT(applications.updated_at, '%Y-%m') AS month,
                    COUNT(*) AS submitted,
                    SUM(CASE WHEN applications.status IN ('Released') THEN 1 ELSE 0 END) AS approved
                FROM applications
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE $whereClause
                GROUP BY DATE_FORMAT(applications.updated_at, '%Y-%m')
                ORDER BY month ASC
            ", $params);
            
            // ✅ Format the data for display with proper month labels
            $formattedTrendsData = [];
            foreach ($trendsData as $data) {
                $monthLabel = date('M Y', strtotime($data['month'] . '-01'));
                $formattedTrendsData[] = [
                    'month' => $monthLabel,
                    'submitted' => $data['submitted'],
                    'approved' => $data['approved']
                ];
            }
            
            if (empty($formattedTrendsData)) {
                $formattedTrendsData = [];
            }
            
            $trendsData = $formattedTrendsData;
            // --- PROGRAMS DATA ---
            $programsData = $db->fetchAll("
                SELECT p.name, COUNT(a.id) AS count 
                FROM programs p
                LEFT JOIN applications a ON a.service_type = p.id
                WHERE DATE(a.updated_at) BETWEEN ? AND ?" . ($department ? " AND p.department = ?" : "") . "
                GROUP BY p.id, p.name 
                ORDER BY count DESC
            ", $department ? array_merge([$fromDate, $toDate], [$department]) : [$fromDate, $toDate]);

            // --- STATUS DISTRIBUTION ---
            $statusData = $db->fetchOne("
                SELECT 
                    SUM(CASE 
                        WHEN applications.status IN (
                            'Pending for approval', 
                            'Approved', 
                            'Waiting for approval of head', 
                            'Waiting for approval of city mayor',
                            'Waiting for approval of mayor',
                            'Ready for release'
                        ) THEN 1 ELSE 0 
                    END) AS pending,
                    SUM(CASE 
                        WHEN applications.status = 'Released' 
                        THEN 1 ELSE 0 
                    END) AS released,
                    SUM(CASE 
                        WHEN applications.status = 'Rejected' 
                        THEN 1 ELSE 0 
                    END) AS rejected
                FROM applications
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE $whereClause
            ", $params);

            // --- ADMIN PERFORMANCE ---
            $adminPerformance = [];
            
            $perfParams = [$fromDate, $toDate];
            $perfDeptFilter = "";
            
            if ($department) {
                $perfDeptFilter = " AND programs.department = ?";
                $perfParams[] = $department;
            }

            $adminPerformance = $db->fetchAll("
                SELECT 
                    admin_users.full_name AS admin_name,
                    COUNT(DISTINCT applications.id) AS processed,
                    LEAST(
                        ROUND(
                            SUM(CASE 
                                WHEN applications.status IN ('Ready for release', 'Released') 
                                THEN 1 ELSE 0 
                            END) * 100.0 / NULLIF(COUNT(DISTINCT applications.id), 0),
                            1
                        ),
                        100
                    ) AS approval_rate,
                    ROUND(
                        AVG(DATEDIFF(applications.updated_at, applications.created_at)), 
                        1
                    ) AS avg_time
                FROM admin_users
                INNER JOIN activity_logs ON admin_users.id = activity_logs.user_id
                INNER JOIN applications ON activity_logs.application_id = applications.id
                INNER JOIN programs ON applications.service_type = programs.id
                WHERE admin_users.role = 'admin'
                AND DATE(applications.created_at) BETWEEN ? AND ?
                $perfDeptFilter
                GROUP BY admin_users.id, admin_users.full_name
                HAVING processed > 0
                ORDER BY processed DESC
                LIMIT 10
            ", $perfParams);

            if (empty($adminPerformance)) {
                $adminPerformance = $db->fetchAll("
                    SELECT 
                        full_name AS admin_name,
                        0 AS processed,
                        0.0 AS approval_rate,
                        0.0 AS avg_time
                    FROM admin_users
                    WHERE is_active = 1
                    " . ($department ? " AND department = ?" : "") . "
                    ORDER BY full_name
                    LIMIT 5
                ", $department ? [$department] : []);
            }

            // --- SEASONAL DATA (FIXED: Get exactly 12 months) ---
            $seasonalData = [];
            for ($i = 1; $i <= 12; $i++) {
                $seasonalParams = [$i];
                $seasonalDeptFilter = "";
                
                if ($department) {
                    $seasonalDeptFilter = " AND programs.department = ?";
                    $seasonalParams[] = $department;
                }
                
                $monthData = $db->fetchOne("
                    SELECT COUNT(*) AS count
                    FROM applications
                    INNER JOIN programs ON applications.service_type = programs.id
                    WHERE MONTH(applications.updated_at) = ?
                    $seasonalDeptFilter
                ", $seasonalParams);
                
                $seasonalData[] = (int)($monthData['count'] ?? 0);
            }

            // ✅ CRITICAL FIX: Create NEW forecast data structure each time
            $forecastData = [
                'labels' => [],
                'historical' => [],
                'predicted' => []
            ];

            // ✅ Get EXACTLY last 6 months of historical data
            $historicalMonths = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = date('Y-m', strtotime("-$i months"));
                $monthLabel = date('M Y', strtotime("-$i months"));
                
                $forecastParams = [$month];
                $forecastDeptFilter = "";
                
                if ($department) {
                    $forecastDeptFilter = " AND programs.department = ?";
                    $forecastParams[] = $department;
                }
                
                $monthCount = $db->fetchOne("
                    SELECT COUNT(*) AS count
                    FROM applications
                    INNER JOIN programs ON applications.service_type = programs.id
                    WHERE DATE_FORMAT(applications.updated_at, '%Y-%m') = ?
                    $forecastDeptFilter
                ", $forecastParams);
                
                $count = (int)($monthCount['count'] ?? 0);
                
                // Add to arrays
                $forecastData['labels'][] = $monthLabel;
                $forecastData['historical'][] = $count;
                $forecastData['predicted'][] = null; // No prediction for historical
                $historicalMonths[] = $count;
            }

            // ✅ Call Python forecasting for ONLY 3 predicted months
            $pythonForecast = callPythonForecast($historicalMonths, $seasonalData);

            $pythonInsights = [];

            if ($pythonForecast && isset($pythonForecast['forecast']) && is_array($pythonForecast['forecast'])) {
                // ✅ Add EXACTLY 3 predicted months
                $forecastCount = min(3, count($pythonForecast['forecast']));
                
                for ($i = 0; $i < $forecastCount; $i++) {
                    $prediction = $pythonForecast['forecast'][$i];
                    $monthLabel = date('M Y', strtotime("+".($i + 1)." months"));
                    
                    $forecastData['labels'][] = $monthLabel;
                    $forecastData['historical'][] = null; // No historical for predictions
                    $forecastData['predicted'][] = (int)$prediction['value'];
                }
                
                $pythonInsights = $pythonForecast['insights'] ?? [];
            } else {
                // ✅ Fallback: Simple statistical prediction for EXACTLY 3 months
                $historicalAvg = count($historicalMonths) > 0 
                    ? array_sum($historicalMonths) / count($historicalMonths) 
                    : 0;
                
                $recentMonths = array_slice($historicalMonths, -3);
                $growthRate = 0;
                
                if (count($recentMonths) >= 2 && $recentMonths[0] > 0) {
                    $growthRate = (end($recentMonths) - $recentMonths[0]) / ($recentMonths[0] * count($recentMonths));
                }
                
                for ($i = 1; $i <= 3; $i++) {
                    $monthLabel = date('M Y', strtotime("+$i months"));
                    $predicted = round($historicalAvg * (1 + ($i * $growthRate)));
                    
                    $forecastData['labels'][] = $monthLabel;
                    $forecastData['historical'][] = null;
                    $forecastData['predicted'][] = max(0, (int)$predicted);
                }
                
                $pythonInsights = [
                    'forecast' => 'Forecast based on statistical trend analysis.',
                    'seasonal' => 'Analyzing seasonal patterns for resource planning.'
                ];
            }

            // ✅ CRITICAL: Validate array lengths before sending
            if (count($forecastData['labels']) !== 9 || 
                count($forecastData['historical']) !== 9 || 
                count($forecastData['predicted']) !== 9) {
                
                error_log("Forecast data length mismatch: " . 
                    "labels=" . count($forecastData['labels']) . 
                    ", historical=" . count($forecastData['historical']) . 
                    ", predicted=" . count($forecastData['predicted']));
                
                // Reset to safe defaults
                $forecastData = [
                    'labels' => array_fill(0, 9, ''),
                    'historical' => array_pad([], 9, null),
                    'predicted' => array_pad([], 9, null)
                ];
            }

            // ✅ SEND RESPONSE with clean arrays
            sendResponse(true, [
                'total_applications' => (int)$totalApplications,
                'total_beneficiaries' => (int)$totalBeneficiaries,
                'approval_rate' => $approvalRate,
                'avg_processing_time' => round($avgProcessingTime, 1),
                'status_data' => $statusData,
                'trends_data' => $trendsData,
                'programs_data' => $programsData,
                'admin_performance' => $adminPerformance,
                'seasonal_data' => array_values($seasonalData),
                'forecast_data' => [
                    'labels' => array_values(array_slice($forecastData['labels'], 0, 9)),
                    'historical' => array_values(array_slice($forecastData['historical'], 0, 9)),
                    'predicted' => array_values(array_slice($forecastData['predicted'], 0, 9))
                ],
                'python_insights' => $pythonInsights
            ]);
            break;

        default:
            http_response_code(405);
            sendResponse(false, null, 'Method not allowed');
            break;
    }

} catch (Exception $e) {
    error_log("Analytics API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load analytics data: ' . $e->getMessage());
}

function callPythonForecast($historicalData, $seasonalData) {
    // 🌐 URL of your deployed Flask API on PythonAnywhere
    $url = "https://k8kit.pythonanywhere.com/forecast";

    // Prepare JSON data for POST
    $payload = json_encode([
        'historical_data' => array_values($historicalData),
        'seasonal_data' => array_values($seasonalData)
    ]);

    // Initialize CURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

    // Optional timeouts
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    // Execute request
    $response = curl_exec($ch);

    if ($response === false) {
        error_log('Curl error: ' . curl_error($ch));
        curl_close($ch);
        return null;
    }

    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpcode >= 200 && $httpcode < 300) {
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg());
            return null;
        }
        return $result;
    } else {
        error_log("Forecast API returned HTTP $httpcode: $response");
        return null;
    }
}

?>