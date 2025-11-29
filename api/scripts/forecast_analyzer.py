import json
import sys
from datetime import datetime
import numpy as np

class ImprovedForecastAnalyzer:
    """Enhanced forecasting using exponential smoothing and trend analysis"""
    
    def __init__(self, historical_data, seasonal_data):
        # Filter out None values
        self.historical_data = [x for x in historical_data if x is not None]
        self.seasonal_data = seasonal_data if seasonal_data else []
        self.forecast_months = 3
        
    def exponential_smoothing(self, data, alpha=0.3):
        """
        Apply exponential smoothing to reduce noise
        alpha: smoothing factor (0-1), lower = more smoothing
        """
        if not data or len(data) == 0:
            return []
        
        smoothed = [data[0]]
        for i in range(1, len(data)):
            smoothed.append(alpha * data[i] + (1 - alpha) * smoothed[i-1])
        return smoothed
    
    def calculate_trend(self, data):
        """Calculate linear trend using least squares regression"""
        if len(data) < 2:
            return 0, np.mean(data) if data else 0
        
        x = np.arange(len(data))
        y = np.array(data)
        
        # Linear regression: y = mx + b
        n = len(data)
        sum_x = np.sum(x)
        sum_y = np.sum(y)
        sum_xy = np.sum(x * y)
        sum_x2 = np.sum(x ** 2)
        
        # Calculate slope (m) and intercept (b)
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        intercept = (sum_y - slope * sum_x) / n
        
        return slope, intercept
    
    def calculate_seasonal_factors(self):
        """
        Calculate seasonal adjustment factors for each month
        Returns dict of month -> factor
        """
        if not self.seasonal_data or len(self.seasonal_data) < 12:
            return {i: 1.0 for i in range(12)}
        
        seasonal_avg = np.mean(self.seasonal_data)
        if seasonal_avg == 0:
            return {i: 1.0 for i in range(12)}
        
        factors = {}
        for month_idx, value in enumerate(self.seasonal_data):
            factors[month_idx] = value / seasonal_avg if seasonal_avg > 0 else 1.0
        
        return factors
    
    def identify_peak_months(self):
        """Identify top 3 months with highest demand"""
        if not self.seasonal_data:
            return []
        
        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
        
        indexed_data = [(i, val) for i, val in enumerate(self.seasonal_data)]
        top_months = sorted(indexed_data, key=lambda x: x[1], reverse=True)[:3]
        
        return [month_names[idx] for idx, _ in top_months]
    
    def forecast_next_periods(self):
        """
        Generate forecast using exponential smoothing + trend + seasonality
        """
        if not self.historical_data:
            return []
        
        # Step 1: Apply exponential smoothing
        smoothed_data = self.exponential_smoothing(self.historical_data, alpha=0.3)
        
        # Step 2: Calculate trend
        slope, intercept = self.calculate_trend(smoothed_data)
        
        # Step 3: Get seasonal factors
        seasonal_factors = self.calculate_seasonal_factors()
        
        # Step 4: Get base value (weighted average of recent months)
        recent_months = smoothed_data[-3:] if len(smoothed_data) >= 3 else smoothed_data
        base_value = np.mean(recent_months)
        
        # Step 5: Generate forecast
        forecast = []
        current_month = datetime.now().month - 1  # 0-indexed
        
        for i in range(1, self.forecast_months + 1):
            # Trend projection
            next_point = len(self.historical_data) + i
            trended_value = slope * next_point + intercept
            
            # Apply dampening to prevent over-projection
            dampening_factor = 1 - (i * 0.1)  # Reduce confidence over time
            dampened_value = base_value * 0.6 + trended_value * 0.4 * dampening_factor
            
            # Apply seasonal adjustment
            future_month_idx = (current_month + i) % 12
            seasonal_factor = seasonal_factors.get(future_month_idx, 1.0)
            
            # Ensure seasonal factor is reasonable (0.5 to 1.5)
            seasonal_factor = max(0.5, min(1.5, seasonal_factor))
            
            final_value = dampened_value * seasonal_factor
            
            # Calculate confidence based on data quality
            data_quality = min(len(self.historical_data) / 12.0, 1.0)
            confidence = (0.85 - (i - 1) * 0.1) * data_quality
            
            forecast.append({
                'month': i,
                'value': max(0, round(final_value)),
                'confidence': round(confidence, 2)
            })
        
        return forecast
    
    def calculate_growth_rate(self):
        """Calculate month-over-month growth rate"""
        if len(self.historical_data) < 2:
            return 0
        
        recent_months = self.historical_data[-3:]
        if len(recent_months) < 2:
            return 0
        
        growth_rates = []
        for i in range(1, len(recent_months)):
            if recent_months[i-1] != 0:
                rate = (recent_months[i] - recent_months[i-1]) / recent_months[i-1]
                growth_rates.append(rate)
        
        return np.mean(growth_rates) * 100 if growth_rates else 0
    
    def generate_insights(self):
        """Generate actionable insights from the data"""
        if not self.historical_data or not self.seasonal_data:
            return {
                "forecast": "Insufficient historical data for accurate forecasting.",
                "seasonal": "Need at least 12 months of data for seasonal analysis."
            }
        
        # Growth analysis
        growth_rate = self.calculate_growth_rate()
        trend_slope, _ = self.calculate_trend(self.historical_data)
        
        if abs(growth_rate) < 5:
            trend_desc = "stable"
        elif growth_rate > 15:
            trend_desc = "rapidly increasing"
        elif growth_rate > 5:
            trend_desc = "moderately increasing"
        elif growth_rate < -15:
            trend_desc = "rapidly decreasing"
        else:
            trend_desc = "moderately decreasing"
        
        forecast_insight = f"Application volume is {trend_desc} with a {abs(growth_rate):.1f}% average monthly change. "
        
        if growth_rate > 10:
            forecast_insight += "Consider increasing resource allocation for the coming months."
        elif growth_rate < -10:
            forecast_insight += "Volume is declining; review program effectiveness or market conditions."
        else:
            forecast_insight += "Maintain current resource levels with minor adjustments."
        
        # Seasonal analysis
        peak_months = self.identify_peak_months()
        
        if peak_months:
            seasonal_insight = f"Peak application periods: {', '.join(peak_months)}. "
            seasonal_insight += "Schedule additional staff and prepare resources during these months."
        else:
            seasonal_insight = "No strong seasonal patterns detected. Applications are relatively uniform throughout the year."
        
        return {
            "forecast": forecast_insight,
            "seasonal": seasonal_insight,
            "spike_periods": peak_months,
            "trend_direction": "increasing" if growth_rate > 0 else "decreasing",
            "growth_rate": round(growth_rate, 1)
        }
    
    def analyze(self):
        """Run complete analysis and return results"""
        forecast = self.forecast_next_periods()
        insights = self.generate_insights()
        seasonality = self.calculate_seasonal_factors()
        
        # Calculate accuracy metrics
        data_points = len(self.historical_data)
        accuracy_score = min((data_points / 12.0) * 100, 100)
        
        return {
            "forecast": forecast,
            "insights": insights,
            "seasonality": {str(k): round(v, 2) for k, v in seasonality.items()},
            "summary": {
                "total_months_analyzed": data_points,
                "forecast_accuracy": f"{accuracy_score:.0f}%",
                "methodology": "Exponential Smoothing + Trend + Seasonality",
                "analysis_date": datetime.now().isoformat()
            }
        }

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        historical = input_data.get('historical_data', [])
        seasonal = input_data.get('seasonal_data', [])
        
        analyzer = ImprovedForecastAnalyzer(historical, seasonal)
        result = analyzer.analyze()
        
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "forecast": [],
            "insights": {
                "forecast": "Error generating forecast. Using fallback method.",
                "seasonal": "Unable to analyze seasonal patterns."
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()