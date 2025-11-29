<?php
session_start();
require_once '../config.php';

try {
    $db = new Database();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Get historical and seasonal data
            $fromDate = $input['from_date'] ?? date('Y-m-d', strtotime('-6 months'));
            $toDate = $input['to_date'] ?? date('Y-m-d');
            $department = $_SESSION['department'] ?? null;

            // --- HISTORICAL DATA (Last 6 months) ---
            $historicalData = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = date('Y-m', strtotime("-$i months"));
                $params = [$month];
                $deptFilter = "";

                if ($department) {
                    $deptFilter = " AND programs.department = ?";
                    $params[] = $department;
                }

                $monthCount = $db->fetchOne("
                    SELECT COUNT(*) AS count
                    FROM applications
                    INNER JOIN programs ON applications.service_type = programs.id
                    WHERE DATE_FORMAT(applications.created_at, '%Y-%m') = ?
                    $deptFilter
                ", $params);

                $historicalData[] = (int)($monthCount['count'] ?? 0);
            }

            // --- SEASONAL DATA (All 12 months) ---
            $seasonalData = [];
            for ($i = 1; $i <= 12; $i++) {
                $params = [$i];
                $deptFilter = "";

                if ($department) {
                    $deptFilter = " AND programs.department = ?";
                    $params[] = $department;
                }

                $monthData = $db->fetchOne("
                    SELECT COUNT(*) AS count
                    FROM applications
                    INNER JOIN programs ON applications.service_type = programs.id
                    WHERE MONTH(applications.created_at) = ?
                    $deptFilter
                ", $params);

                $seasonalData[] = (int)($monthData['count'] ?? 0);
            }

            // --- Call Python script ---
            $pythonScript = __DIR__ . '/../../scripts/forecast_analyzer.py';
            $inputData = json_encode([
                'historical_data' => $historicalData,
                'seasonal_data' => $seasonalData
            ]);

            // ✅ Use "python" instead of "python3" for Windows
            $command = 'python ' . escapeshellarg($pythonScript);

            $process = proc_open(
                $command,
                [
                    0 => ['pipe', 'r'],
                    1 => ['pipe', 'w'],
                    2 => ['pipe', 'w']
                ],
                $pipes
            );

            if (!is_resource($process)) {
                throw new Exception("Failed to execute Python script");
            }

            fwrite($pipes[0], $inputData);
            fclose($pipes[0]);

            $output = stream_get_contents($pipes[1]);
            $error = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);

            $returnCode = proc_close($process);

            if ($returnCode !== 0) {
                throw new Exception("Python script error: " . $error);
            }

            $analysisResult = json_decode($output, true);

            if (isset($analysisResult['error'])) {
                throw new Exception($analysisResult['error']);
            }

            sendResponse(true, [
                'forecast' => array_slice($analysisResult['forecast'], 0, 3),
                'insights' => $analysisResult['insights'],
                'seasonality' => $analysisResult['seasonality'],
                'summary' => $analysisResult['summary'],
                'historical_data' => $historicalData,
                'seasonal_data' => $seasonalData
            ]);
            break;

        default:
            http_response_code(405);
            sendResponse(false, null, 'Method not allowed');
            break;
    }

} catch (Exception $e) {
    error_log("Python Forecast API Error: " . $e->getMessage());
    sendResponse(false, null, 'Forecast analysis failed: ' . $e->getMessage());
}
?>
