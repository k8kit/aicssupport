// Admin Analytics Management (Enhanced: animations + chart design)
class AdminAnalytics {
    constructor() {
        this.charts = {};
        this.allBeneficiaries = []
        this.currentPage = 1
        this.itemsPerPage = 10
        this.searchQuery = ''
        this.searchTimeout = null


        
        this.currentFilters = {
            from_date: '2020-01-01',// First day of current month
            to_date: this.formatLocalDate(new Date()),      // Today
            program_id: '',
            status: ''
        };
        this.statAnimHandles = {};
        this.init();
    }
    init() {
        this.injectChartContainerStyles();
        this.setupEventListeners();
        this.loadPrograms();
        this.loadBeneficiaries();
        this.setupSearchListeners()


        const fromDateInput = document.getElementById('from-date');
        const toDateInput = document.getElementById('to-date');
        if (fromDateInput) fromDateInput.value = this.currentFilters.from_date;
        if (toDateInput) toDateInput.value = this.currentFilters.to_date;
        this.loadAnalytics();
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    }
    

    // Adds a tiny CSS block for chart container entrance animations
    injectChartContainerStyles() {
        if (document.getElementById('admin-analytics-styles')) return;
        const style = document.createElement('style');
        style.id = 'admin-analytics-styles';
        style.textContent = `
            .chart-card { opacity: 0; transform: translateY(8px); transition: opacity 420ms ease, transform 420ms cubic-bezier(.2,.8,.2,1); }
            .chart-card.visible { opacity: 1; transform: translateY(0); }
            .stat-counter { transition: transform 240ms ease; display:inline-block; }
            .stat-counter.pop { transform: scale(1.06); }
            .chart-canvas { width:100%; height:320px; }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Quick filters
        document.querySelectorAll('.quick-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.quick-filter').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyQuickFilter(e.target.dataset.filter);
            });
        });

        // Apply filters button
        const applyBtn = document.getElementById('apply-filters');
        if (applyBtn) applyBtn.addEventListener('click', () => {
            this.applyCustomFilters();
        });

        // Export buttons
        const exports = {
            'export-descriptive': () => this.exportDescriptive(),
            'export-predictive': () => this.exportPredictive(),
            'export-status': () => this.exportChart('status'),
            'export-trend': () => this.exportChart('trends'),
            'export-performance': () => this.exportChart('performance'),
            'export-programs': () => this.exportChart('programs'),
            'export-forecast': () => this.exportChart('forecast'),
            'export-seasonal': () => this.exportChart('seasonal')
        };
        Object.entries(exports).forEach(([id, fn]) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        });
    }

    applyQuickFilter(filter) {
        let fromDate, toDate;
        const today = new Date();

        switch(filter) {
            case 'all':
                // Show all data from a far past date to today
                fromDate = '2023-01-01';
                toDate = this.getDateString(0);
                console.log('All filter dates:', fromDate, 'to', toDate); 
                break;
            case 'today':
                fromDate = toDate = this.getDateString(0);
                break;
            case 'week':
                // Get first day of current week (Sunday)
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                fromDate = this.formatLocalDate(firstDayOfWeek);
                toDate = this.getDateString(0);
                break;
            case 'month':
                // Get first day of current month
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                fromDate = this.formatLocalDate(firstDayOfMonth);
                toDate = this.getDateString(0);
                break;
            case 'custom':
                document.getElementById('custom-date-range').style.display = 'block';
                document.getElementById('custom-date-range-to').style.display = 'block';
                return;
        }

        document.getElementById('custom-date-range').style.display = 'none';
        document.getElementById('custom-date-range-to').style.display = 'none';
        
        // Update filters
        this.currentFilters.from_date = fromDate;
        this.currentFilters.to_date = toDate;
        
        // ✅ Update the input fields to match the quick filter dates
        const fromDateInput = document.getElementById('from-date');
        const toDateInput = document.getElementById('to-date');
        if (fromDateInput) fromDateInput.value = fromDate;
        if (toDateInput) toDateInput.value = toDate;
        
        this.loadAnalytics();

        this.loadBeneficiaries();
    }

    applyCustomFilters() {
        const fromDate = document.getElementById('from-date').value;
        const toDate = document.getElementById('to-date').value;
        const programId = document.getElementById('program-filter').value;
        const status = document.getElementById('status-filter').value;

        if (fromDate) this.currentFilters.from_date = fromDate;
        if (toDate) this.currentFilters.to_date = toDate;
        this.currentFilters.program_id = programId;
        this.currentFilters.status = status;

        this.loadAnalytics();
        this.loadBeneficiaries();
    }

    getDateString(daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return this.formatLocalDate(date);
    }

    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async loadPrograms() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/programs.php');
            if (!response) return;

            const result = await response.json();
            if (result.success) {
                this.renderProgramFilter(result.data);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    renderProgramFilter(programs) {
        const filter = document.getElementById('program-filter');
        if (!filter) return;

        const options = programs.map(program => 
            `<option value="${program.id}">${program.name}</option>`
        ).join('');

        filter.innerHTML = '<option value="">All Programs</option>' + options;
    }

    async loadAnalytics() {
        try {
            const queryString = new URLSearchParams(this.currentFilters).toString();
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/analytics.php?${queryString}`);
            
            if (!response) {
                console.error('No response from analytics API');
                return;
            }

            const result = await response.json();
            
            console.log('Analytics API Response:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Update stats with count-up animation
                this.updateStats(data);
                
                // Destroy existing charts
                Object.keys(this.charts).forEach(key => {
                    if (this.charts[key]) {
                        this.charts[key].destroy();
                        delete this.charts[key];
                    }
                });
                
                // Small delay to ensure charts are destroyed
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Render charts with fresh data and animate containers in
                this.renderStatusChart(data.status_data);
                this.renderTrendsChart(data.trends_data);
                this.renderProgramsChart(data.programs_data);
                this.renderPerformanceChart(data.admin_performance);
                this.renderForecastChart(data.forecast_data, data.python_insights);
                this.renderSeasonalChart(data.seasonal_data, data.python_insights);
                
                // add visible class to chart cards so CSS entrance animation runs
                document.querySelectorAll('.chart-card').forEach(el => {
                    requestAnimationFrame(() => el.classList.add('visible'));
                });

                console.log('All charts rendered successfully');
            } else {
                console.error('API returned unsuccessful response:', result);
                this.showError(result.message || 'Failed to load analytics data');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics data: ' + error.message);
        }
    }

    // Smooth count-up with pop animation
    updateStats(data) {
        this.animateStat('total-applications', parseInt(data.total_applications) || 0, 700);
        this.animateStat('total-beneficiaries', parseInt(data.total_beneficiaries) || 0, 700);
        // approval rate as percentage (keeps decimal if present)
        const approval = (typeof data.approval_rate !== 'undefined') ? parseFloat(data.approval_rate) : 0;
        this.animateStat('approval-rate', approval, 700, value => `${Number(value).toFixed(1)}%`);
        this.animateStat('avg-processing-time', parseFloat(data.avg_processing_time) || 0, 700, value => `${Math.round(value)} days`);
    }

    animateStat(elementId, targetValue, duration = 700, formatter = (v) => v) {
        const el = document.getElementById(elementId);
        if (!el) return;

        // clear previous animation
        if (this.statAnimHandles[elementId]) cancelAnimationFrame(this.statAnimHandles[elementId]);

        const startValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
        const startTime = performance.now();
        const delta = targetValue - startValue;

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const current = startValue + delta * eased;
            el.textContent = formatter(current);
            if (t < 1) {
                this.statAnimHandles[elementId] = requestAnimationFrame(tick);
            } else {
                // final value and pop
                el.textContent = formatter(targetValue);
                el.classList.add('stat-counter', 'pop');
                setTimeout(() => el.classList.remove('pop'), 260);
            }
        };

        this.statAnimHandles[elementId] = requestAnimationFrame(tick);
    }

    // Helper to build gradient fills
    createGradient(ctx, height, colorStart, colorEnd) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height || 300);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    }

    renderStatusChart(statusData) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;
        if (this.charts.status) this.charts.status.destroy();
        
        const values = [
            parseInt(statusData.pending) || 0,
            parseInt(statusData.released) || 0,
            parseInt(statusData.rejected) || 0
        ];
        
        const labels = ['Pending', 'Released', 'Rejected'];
        const baseColors = ['#FFC107', '#28A745', '#DC3545'];
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: baseColors,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${ctx.formattedValue}`
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 850,
                    easing: 'easeOutCubic'
                }
            }
        });
    }

    renderTrendsChart(trendsData) {
        const ctx = document.getElementById('trendsChart');
        if (!ctx) return;

        if (this.charts.trends) this.charts.trends.destroy();

        const labels = trendsData.map(d => d.month);
        const submitted = trendsData.map(d => parseInt(d.submitted) || 0);
        const approved = trendsData.map(d => parseInt(d.approved) || 0);

        const gradientA = this.createGradient(ctx.getContext('2d'), 300, 'rgba(0,123,255,0.35)', 'rgba(0,123,255,0.03)');
        const gradientB = this.createGradient(ctx.getContext('2d'), 300, 'rgba(40,167,69,0.35)', 'rgba(40,167,69,0.03)');

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Applications',
                        data: submitted,
                        borderColor: '#007bff',
                        backgroundColor: gradientA,
                        tension: 0.36,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Released',
                        data: approved,
                        borderColor: '#28a745',
                        backgroundColor: gradientB,
                        tension: 0.36,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },
                    x: {
                        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 13 }
                    }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    renderProgramsChart(programsData) {
        const ctx = document.getElementById('programsChart');
        if (!ctx) return;

        if (this.charts.programs) this.charts.programs.destroy();

        const labels = programsData.map(p => p.name);
        const counts = programsData.map(p => parseInt(p.count) || 0);

        // build dynamic gradient for bars
        const g = this.createGradient(ctx.getContext('2d'), 300, 'rgba(0,123,255,0.9)', 'rgba(0,123,255,0.2)');

        this.charts.programs = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Applications',
                    data: counts,
                    backgroundColor: g,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },
                    x: {
                        ticks: { autoSkip: false }
                    }
                },
                animation: { duration: 700, easing: 'easeOutCubic' }
            }
        });
    }

    renderPerformanceChart(performanceData) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        if (this.charts.performance) this.charts.performance.destroy();

        const labels = performanceData.map(p => p.admin_name);
        const processed = performanceData.map(p => parseInt(p.processed) || 0);
        const approvalRates = performanceData.map(p => parseFloat(p.approval_rate) || 0);

        const gBlue = this.createGradient(ctx.getContext('2d'), 300, 'rgba(0,123,255,0.9)', 'rgba(0,123,255,0.2)');
        const gGreen = this.createGradient(ctx.getContext('2d'), 300, 'rgba(40,167,69,0.85)', 'rgba(40,167,69,0.2)');

        this.charts.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Applications Processed',
                        data: processed,
                        backgroundColor: gBlue,
                        yAxisID: 'y',
                        borderRadius: 6
                    },
                    {
                        label: 'Approval Rate (%)',
                        data: approvalRates,
                        type: 'line',
                        borderColor: '#28a745',
                        backgroundColor: gGreen,
                        yAxisID: 'y1',
                        tension: 0.36,
                        pointRadius: 4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        title: { display: true, text: 'Applications Processed' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Approval Rate (%)' }
                    }
                },
                animation: { duration: 900, easing: 'easeOutQuart' }
            }
        });
    }

    renderForecastChart(forecastData, insights) {
        const canvasId = 'forecastChart';
        const ctx = document.getElementById(canvasId);
        
        if (!ctx) {
            console.error('Forecast chart canvas not found');
            return;
        }

        // NUCLEAR OPTION: replace canvas to avoid Chart.js reuse bugs
        const parent = ctx.parentElement;
        const canvasClone = ctx.cloneNode(false);
        
        if (this.charts.forecast) {
            this.charts.forecast.destroy();
            delete this.charts.forecast;
        }
        
        parent.removeChild(ctx);
        parent.insertBefore(canvasClone, parent.firstChild);
        
        const newCtx = document.getElementById(canvasId);

        if (!forecastData?.labels || !forecastData?.historical || !forecastData?.predicted) {
            console.error('Invalid forecast data');
            return;
        }

        const EXPECTED_LENGTH = 9;
        const labels = forecastData.labels.slice(0, EXPECTED_LENGTH);
        const historical = forecastData.historical.slice(0, EXPECTED_LENGTH);
        const predicted = forecastData.predicted.slice(0, EXPECTED_LENGTH);

        const ctx2d = newCtx.getContext('2d');
        const gradHist = this.createGradient(ctx2d, 300, 'rgba(0,123,255,0.35)', 'rgba(0,123,255,0.03)');
        const gradPred = this.createGradient(ctx2d, 300, 'rgba(220,53,69,0.32)', 'rgba(220,53,69,0.03)');

        this.charts.forecast = new Chart(newCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Historical',
                        data: historical,
                        borderColor: '#007bff',
                        backgroundColor: gradHist,
                        tension: 0.36,
                        fill: true,
                        pointRadius: 4,
                        borderWidth: 2
                    },
                    {
                        label: 'Predicted',
                        data: predicted,
                        borderColor: '#dc3545',
                        backgroundColor: gradPred,
                        borderDash: [6,4],
                        tension: 0.36,
                        fill: true,
                        pointStyle: 'rectRot',
                        pointRadius: 4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                },
                interaction: { mode: 'nearest', intersect: false },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                },
                animation: { duration: 900, easing: 'easeOutQuint' }
            }
        });

        const insightEl = document.getElementById('forecast-insight');
        if (insightEl) insightEl.textContent = insights?.forecast || 'Forecast generated.';
    }

    renderSeasonalChart(seasonalData, insights) {
        const canvasId = 'seasonalChart';
        const ctx = document.getElementById(canvasId);
        
        if (!ctx) {
            console.error('Seasonal chart canvas not found');
            return;
        }

        const parent = ctx.parentElement;
        const canvasClone = ctx.cloneNode(false);
        
        if (this.charts.seasonal) {
            this.charts.seasonal.destroy();
            delete this.charts.seasonal;
        }
        
        parent.removeChild(ctx);
        parent.insertBefore(canvasClone, parent.firstChild);
        
        const newCtx = document.getElementById(canvasId);

        const EXPECTED_LENGTH = 12;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let cleanData = Array.isArray(seasonalData) ? seasonalData.slice(0, EXPECTED_LENGTH) : [];
        while (cleanData.length < EXPECTED_LENGTH) cleanData.push(0);
        cleanData = cleanData.slice(0, EXPECTED_LENGTH).map(v => parseInt(v) || 0);

        const maxValue = Math.max(...cleanData, 1);
        const ctx2d = newCtx.getContext('2d');
        const bars = cleanData.map(value => {
            const intensity = value / maxValue;
            // produce softer color scale
            return `rgba(${Math.round(0 + 40*intensity)}, ${Math.round(123 + 80*intensity)}, ${Math.round(255 - 80*intensity)}, 0.85)`;
        });

        this.charts.seasonal = new Chart(newCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Applications by Month',
                    data: cleanData,
                    backgroundColor: bars,
                    borderRadius: 6,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                },
                animation: { duration: 800, easing: 'easeOutCubic' }
            }
        });

        const insightEl = document.getElementById('spike-insight');
        if (insightEl) insightEl.textContent = insights?.seasonal || 'Analyzing patterns.';
    }    

// Export functions - PDF Generation
    async exportDescriptive() {
        const filename = this.getExportFilename('descriptive_analytics');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // ============ PAGE 1: Stats + Status Chart ============
            doc.setFontSize(20);
            doc.setTextColor(0, 123, 255);
            doc.text('Descriptive Analytics Report', 14, 15);
            
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 22);
            doc.text(`Period: ${this.currentFilters.from_date} to ${this.currentFilters.to_date}`, 14, 27);
            
            // Stats section
            const stats = {
                'Total Applications': document.getElementById('total-applications').textContent,
                'Total Beneficiaries': document.getElementById('total-beneficiaries').textContent,
                'Approval Rate': document.getElementById('approval-rate').textContent,
                'Average Processing Time': document.getElementById('avg-processing-time').textContent
            };
            
            let yPos = 38;
            doc.setFontSize(11);
            doc.setTextColor(0);
            
            Object.entries(stats).forEach(([metric, value]) => {
                doc.setFont(undefined, 'bold');
                doc.text(metric + ':', 14, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(value, 75, yPos);
                yPos += 8;
            });
            
            // Applications by Status Chart
            const statusChart = this.charts.status;
            if (statusChart) {
                yPos += 5;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Applications by Status', 14, yPos);
                
                const canvas = statusChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 110;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, yPos + 5, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, yPos + 5, imgWidth, imgHeight);
                }
            }
            
            // ============ PAGE 2: Three Charts ============
            doc.addPage();
            
            // Application Trend Chart
            const trendsChart = this.charts.trends;
            if (trendsChart) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text('Application Trend', 14, 15);
                
                const canvas = trendsChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 65;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 20, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, 20, imgWidth, Math.min(imgHeight, maxHeight));
                }
            }
            
            // Admin Performance Metrics Chart
            const performanceChart = this.charts.performance;
            if (performanceChart) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Admin Performance Metrics', 14, 95);
                
                const canvas = performanceChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 65;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 100, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, 100, imgWidth, Math.min(imgHeight, maxHeight));
                }
            }
            
            // Most Requested Programs Chart
            const programsChart = this.charts.programs;
            if (programsChart) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Most Requested Programs', 14, 175);
                
                const canvas = programsChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 65;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 180, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, 180, imgWidth, Math.min(imgHeight, maxHeight));
                }
            }
            
            doc.save(filename + '.pdf');
            this.showSuccess('Descriptive analytics exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export descriptive analytics');
        }
    }

    async exportPredictive() {
        const filename = this.getExportFilename('predictive_analytics');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // ============ SINGLE PAGE: Both Predictive Charts ============
            doc.setFontSize(20);
            doc.setTextColor(220, 53, 69);
            doc.text('Predictive Analytics Report', 14, 15);
            
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 22);
            doc.text(`Period: ${this.currentFilters.from_date} to ${this.currentFilters.to_date}`, 14, 27);
            
            // Resource Consumption Forecast
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont(undefined, 'bold');
            doc.text('Resource Consumption Forecast', 14, 38);
            
            const forecastChart = this.charts.forecast;
            if (forecastChart) {
                const canvas = forecastChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 80;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 43, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, 43, imgWidth, Math.min(imgHeight, maxHeight));
                }
                
                // Add AI insight
                const forecastInsight = document.getElementById('forecast-insight');
                if (forecastInsight) {
                    doc.setFontSize(8);
                    doc.setTextColor(0, 123, 255);
                    doc.text('AI Prediction:', 14, 128);
                    doc.setTextColor(0);
                    doc.setFont(undefined, 'normal');
                    const insightText = doc.splitTextToSize(forecastInsight.textContent, pageWidth - 28);
                    doc.text(insightText, 14, 133);
                }
            }
            
            // Seasonal Application Spike Predictor
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont(undefined, 'bold');
            doc.text('Seasonal Application Spike Predictor', 14, 150);
            
            const seasonalChart = this.charts.seasonal;
            if (seasonalChart) {
                const canvas = seasonalChart.canvas;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const maxHeight = 80;
                
                if (imgHeight > maxHeight) {
                    const scaledWidth = (maxHeight * imgWidth) / imgHeight;
                    doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 155, scaledWidth, maxHeight);
                } else {
                    doc.addImage(imgData, 'PNG', 14, 155, imgWidth, Math.min(imgHeight, maxHeight));
                }
                
                // Add AI insight
                const spikeInsight = document.getElementById('spike-insight');
                if (spikeInsight) {
                    doc.setFontSize(8);
                    doc.setTextColor(255, 193, 7);
                    doc.text('AI Alert:', 14, 240);
                    doc.setTextColor(0);
                    doc.setFont(undefined, 'normal');
                    const insightText = doc.splitTextToSize(spikeInsight.textContent, pageWidth - 28);
                    doc.text(insightText, 14, 245);
                }
            }
            
            doc.save(filename + '.pdf');
            this.showSuccess('Predictive analytics exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export predictive analytics');
        }
    }

    async exportChart(chartType) {
        const chart = this.charts[chartType];
        if (!chart) {
            this.showError('Chart not found');
            return;
        }

        const filename = this.getExportFilename(chartType);
        
        try {
            // Get chart as image
            const canvas = chart.canvas;
            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add title
            doc.setFontSize(16);
            doc.text(this.getChartTitle(chartType), 14, 15);
            
            // Add metadata
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 22);
            doc.text(`Period: ${this.currentFilters.from_date} to ${this.currentFilters.to_date}`, 14, 27);
            
            // Add chart image
            const imgWidth = 270;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 14, 35, imgWidth, imgHeight);
            
            doc.save(filename + '.pdf');
            this.showSuccess('Chart exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export chart');
        }
    }

    getExportFilename(chartType) {
        const fromDate = this.currentFilters.from_date;
        const toDate = this.currentFilters.to_date;
        
        // Check if using default filter (current month)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const isCurrentMonth = (fromDate === this.formatLocalDate(firstDayOfMonth) && 
                               toDate === this.formatLocalDate(today));
        
        if (isCurrentMonth) {
            // Use current date format: YYYY-MM-DD
            return `${chartType}_${this.formatLocalDate(today)}`;
        } else {
            // Use date range format: YYYY-MM-DD_to_YYYY-MM-DD
            return `${chartType}_${fromDate}_to_${toDate}`;
        }
    }

    getChartTitle(chartType) {
        const titles = {
            'status': 'Applications by Status',
            'trends': 'Application Trend',
            'performance': 'Admin Performance Metrics',
            'programs': 'Most Requested Programs',
            'forecast': 'Resource Consumption Forecast',
            'seasonal': 'Seasonal Spike Predictor'
        };
        return titles[chartType] || chartType;
    }

    downloadCSV(filename, rows) {
        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    updateCurrentTime() {
        const now = new Date();
        const el = document.getElementById('current-time');
        if (el) el.textContent = now.toLocaleTimeString('en-PH');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
    getFilters() {
        return {
            from_date: this.currentFilters.from_date,
            to_date: this.currentFilters.to_date,
            program_id: this.currentFilters.program_id,
            status: this.currentFilters.status
        };
    }

    setupSearchListeners() {
        // Search
        const searchInput = document.getElementById('search-input')
        const searchBtn = document.getElementById('search-btn')

        if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout)
            this.searchTimeout = setTimeout(() => {
            this.searchQuery = e.target.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
            }, 300)
        })

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
            clearTimeout(this.searchTimeout)
            this.searchQuery = e.target.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
            }
        })
        }

        if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            this.searchQuery = searchInput.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        })
        }
                // Export CSV button
        const exportBtn = document.getElementById('export-beneficiaries-csv')
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportBeneficiariesCSV())
        }
    }
    exportBeneficiariesCSV() {
        try {
            // Get filtered beneficiaries
            let beneficiaries = this.allBeneficiaries || [];

            if (this.searchQuery) {
                beneficiaries = beneficiaries.filter(b =>
                    b.reference_no.toLowerCase().includes(this.searchQuery) ||
                    b.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
                );
            }

            if (beneficiaries.length === 0) {
                this.showError('No data to export');
                return;
            }

            // Create CSV header
            const headers = ['Date Approved', 'Reference Number', 'Beneficiary Name', 'Type of Assistance', 'Email'];
            
            // Create CSV rows
            const rows = beneficiaries.map(b => [
                this.formatDate(b.updated_at),
                b.reference_no,
                b.beneficiary_full_name,
                b.service_name,
                b.email
            ]);

            // Combine headers and rows
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Generate filename based on filters
            const filename = this.getBeneficiariesExportFilename();

            // Create and download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Beneficiaries data exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export beneficiaries data');
        }
    }

    async loadBeneficiaries() {
        try {
            const filters = this.getFilters()
            const queryString = new URLSearchParams(filters).toString()
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/released.php?${queryString}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.allBeneficiaries = result.data;

                this.renderBeneficiariesTable();
                this.renderPaginationControls()
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
            this.showError('Failed to load beneficiaries data');
        }
    }


    renderBeneficiariesTable() {
        const tbody = document.getElementById('beneficiaries-tbody');
        if (!tbody) return;

        let beneficiaries = this.allBeneficiaries || [];

        if (this.searchQuery) {
            beneficiaries = beneficiaries.filter(b =>
                b.reference_no.toLowerCase().includes(this.searchQuery) ||
                b.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
            );
        }

        if (beneficiaries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No approved beneficiaries found</p>
                    </td>
                </tr>
            `;
            return;
        }
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = beneficiaries.slice(startIndex, startIndex + this.itemsPerPage);

        tbody.innerHTML = paginated.map(beneficiary => `
            <tr>
                <td>${this.formatDate(beneficiary.updated_at)}</td>
                <td>
                    <span class="fw-bold text-primary">${beneficiary.reference_no}</span>
                </td>
                <td>${beneficiary.beneficiary_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${beneficiary.service_name}</span>
                </td>
                <td>${beneficiary.email}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                        onclick="adminAnalytics.viewApplication('${beneficiary.id}')"
                        title="View Application">
                        <i class="bi bi-file-text me-1"></i>
                        </button>
                    </div>
                </td>

            </tr>
        `).join('');
    }

    renderPaginationControls() {
        const totalItems = (this.allBeneficiaries || []).filter(a =>
        !this.searchQuery ||
        a.reference_no.toLowerCase().includes(this.searchQuery) ||
        a.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
        ).length

        const totalPages = Math.ceil(totalItems / this.itemsPerPage)
        const pageNumbers = document.getElementById('page-numbers')
        const prevBtn = document.getElementById('prev-page')
        const nextBtn = document.getElementById('next-page')
        

        if (!pageNumbers || !prevBtn || !nextBtn) return

        pageNumbers.innerText = `Page ${this.currentPage} of ${totalPages || 1}`
        prevBtn.disabled = this.currentPage === 1
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0

        prevBtn.onclick = () => {
        if (this.currentPage > 1) {
            this.currentPage--
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        }
        }

        nextBtn.onclick = () => {
        if (this.currentPage < totalPages) {
            this.currentPage++
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        }
        }
    }

    async viewApplication(applicationId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(
                `../api/admin/application-details.php?id=${applicationId}`
            )
            if (!response) return

            const result = await response.json()

            if (result.success) {
                this.currentApplicationId = applicationId
                this.renderApplicationDetails(result.data)
                const modal = new bootstrap.Modal(document.getElementById("applicationModal"))
                modal.show()
            }
        } catch (error) {
            console.error("Error loading application details:", error)
            this.showError("Failed to load application details")
        }
    }

  renderApplicationDetails(application) {
    const container = document.getElementById("application-details")
    if (!container) return

    container.innerHTML = `
            <div class="application-form-view">
                <!-- I. Client's Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">I. Client's Identifying Information</h6>
                    <div class="form-grid">
                        ${this.renderClientIdentifyingSection(application)}
                    </div>
                </div>
                
                <!-- II. Beneficiary Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">II. Beneficiary Identifying Information</h6>
                    <div class="form-grid">
                        ${this.renderBeneficiaryIdentifyingSection(application)}
                    </div>
                </div>
                
                <!-- III. Beneficiary's Family Composition -->
                <div class="form-section">
                    <h6 class="section-title">III. Beneficiary's Family Composition</h6>
                    <div class="family-table-container">
                        <table class="family-table">
                            <thead>
                                <tr>
                                    <th rowspan="2">Full Name</th>
                                    <th rowspan="2">Sex</th>
                                    <th rowspan="2">Birthdate<br><small>yyyy/mm/dd</small></th>
                                    <th rowspan="2">Civil Status</th>
                                    <th rowspan="2">Relationship</th>
                                    <th rowspan="2">Highest Educational Attainment</th>
                                    <th rowspan="2">Skills / Occupation</th>
                                    <th rowspan="2">Est. Monthly Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderFamilyRows(application.family_members)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- IV. Assessment -->
                <div class="form-section">
                    <h6 class="section-title">IV. Assessment</h6>
                    <table class="form-table">
                        <tr>
                            <td style="width: 33%; vertical-align: top; padding: 10px;">
                                <strong>1. Problem/s Presented</strong>
                                <textarea rows="12" name="problems_presented" readonly style="width: 100%; margin-top: 5px;">${application.problems_presented || ""}</textarea>
                            </td>
                            <td style="width: 33%; vertical-align: top; padding: 10px; border-left: 3px solid #000;">
                                <strong>2. Social Worker's Assessment</strong>
                                <textarea rows="12" name="social_worker_assessment" readonly style="width: 100%; margin-top: 5px;">${application.social_worker_assessment || ""}</textarea>
                            </td>
                            <td style="width: 34%; vertical-align: top; padding: 10px; border-left: 3px solid #000;">
                                <strong>3. Client Category <small>(check only one)</small></strong>
                                <div class="checkbox-group-vertical" style="margin-top: 5px;">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Children in Need of Special Protection" ${application.client_category === "Children in Need of Special Protection" ? "checked" : ""} disabled> Children in Need of Special Protection
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Youth in Need of Special Protection" ${application.client_category === "Youth in Need of Special Protection" ? "checked" : ""} disabled> Youth in Need of Special Protection
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Women in Especially Difficult Circumstances" ${application.client_category === "Women in Especially Difficult Circumstances" ? "checked" : ""} disabled> Women in Especially Difficult Circumstances
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Person with Disability" ${application.client_category === "Person with Disability" ? "checked" : ""} disabled> Person with Disability
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Senior Citizen" ${application.client_category === "Senior Citizen" ? "checked" : ""} disabled> Senior Citizen
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Family Head and Other Needy Adult" ${application.client_category === "Family Head and Other Needy Adult" ? "checked" : ""} disabled> Family Head and Other Needy Adult
                                    </label>
                                </div>
                                <div style="margin-top: 10px;">
                                    <strong>4. Client Sub-Category</strong>
                                    <input type="text" name="client_subcategory" value="${application.client_subcategory || ""}" readonly style="width: 100%; margin-top: 5px;">
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- V. Recommended Services and Assistance - Matching the image layout exactly -->
                <div class="form-section">
                  <h6 class="section-title">V. Recommended Services and Assistance</h6>

                  <div class="form-grid">
                    <!-- 1. Nature of Service / Assistance -->
                    <div class="form-row">
                      <div class="form-group col-12">
                        <label>1. Nature of Service / Assistance</label>
                        <div class="checkbox-group-inline" style="display: flex; flex-wrap: wrap; gap: 50px; align-items: center;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Counseling"
                              ${application.service_type_nature === "Counseling" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Counseling
                          </label>
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Legal Assistance"
                              ${application.service_type_nature === "Legal Assistance" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Legal Assistance
                          </label>
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Referral"
                              ${application.service_type_nature === "Referral" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Referral
                          </label>
                          <!-- Referral Specify Input (next to Referral checkbox) -->
                          <input
                            type="text"
                            name="service_nature_referral_specify"
                            value="${application.service_nature_referral_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.service_type_nature === 'Referral' ? '' : 'd-none'}"
                            placeholder="Please specify referral details..."
                            style="width: 250px; margin: 0;"
                          >
                          
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Others"
                              ${application.service_type_nature === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Others
                          </label>
                          <!-- Others Specify Input (next to Others checkbox) -->
                          <input
                            type="text"
                            name="service_nature_others_specify"
                            value="${application.service_nature_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.service_type_nature === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify other service..."
                            style="width: 250px; margin: 0;"
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Financial & Material Assistance -->
                    <div class="form-row mt-3">
                      <div class="form-group col-6">
                      <!-- Financial Assistance -->
                      <label class="fw-bold">Financial Assistance</label>
                      <div class="checkbox-group-vertical mt-2">
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Medical"
                            ${application.financial_type === "Medical" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Medical
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Burial"
                            ${application.financial_type === "Burial" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Burial
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Transportation"
                            ${application.financial_type === "Transportation" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Transportation
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Educational"
                            ${application.financial_type === "Educational" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Educational
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Food Subsidy"
                            ${application.financial_type === "Food Subsidy" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Food Subsidy
                        </label>
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 8px;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                            <input
                              type="checkbox"
                              name="financial_type"
                              value="Others"
                              ${application.financial_type === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Others
                          </label>
                          <input
                            type="text"
                            name="financial_others_specify"
                            value="${application.financial_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.financial_type === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify..."
                            style="flex: 1; margin: 0; min-width: 200px; max-width: 400px;"
                          >
                        </div>
                      </div>

                      <div class="mt-2">
                        <label>Sub-total:</label>
                        <input
                          type="text"
                          name="assistance_subtotal"
                          value="${application.assistance_subtotal || ''}"
                          readonly
                        >
                      </div>

                      <!-- Material Assistance -->
                      <label class="fw-bold mt-3">Material Assistance</label>
                      <div class="checkbox-group-vertical mt-2">
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Food Pack"
                            ${application.material_assistance === "Food Pack" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Food Pack
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Used Clothing"
                            ${application.material_assistance === "Used Clothing" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Used Clothing
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Hot Meal"
                            ${application.material_assistance === "Hot Meal" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Hot Meal
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Assistive Device"
                            ${application.material_assistance === "Assistive Device" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Assistive Device
                        </label>
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 8px;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                            <input
                              type="checkbox"
                              name="material_assistance"
                              value="Others"
                              ${application.material_assistance === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Others
                          </label>
                          <input
                            type="text"
                            name="material_others_specify"
                            value="${application.material_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.material_assistance === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify..."
                            style="flex: 1; margin: 0; min-width: 200px; max-width: 400px;"
                          >
                        </div>
                      </div>
                    </div>

                      <!-- Value, Mode, and Source -->
                      <div class="form-group col-">
                        <label>Value (₱) / Amount of Financial Assistance to be Extended:</label>
                        <div class="income-field">
                          <span>₱</span>
                          <input
                            type="text"
                            name="assistance_amount"
                            value="${application.assistance_amount || ''}"
                            readonly
                          >
                        </div>

                        <!-- Mode of Assistance -->
                        <label class="mt-2">Mode of Financial Assistance</label>
                        <div class="checkbox-group-vertical mt-2">
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Cash"
                              ${application.assistance_mode === "Cash" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Cash
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Check"
                              ${application.assistance_mode === "Check" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Check
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Guarantee Letter"
                              ${application.assistance_mode === "Guarantee Letter" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Guarantee Letter
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Tickets"
                              ${application.assistance_mode === "Tickets" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Tickets
                          </label>

                          <!-- Transport Modes -->
                          <div class="checkbox-group-inline mt-2" style="display: flex; flex-wrap: wrap; gap: 25px; align-items: center; margin-left: 20px;">
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Bus"
                                ${application.transport_mode === "Bus" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Bus
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Boat"
                                ${application.transport_mode === "Boat" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Boat
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Plane"
                                ${application.transport_mode === "Plane" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Plane
                            </label>
                          </div>
                        </div>

                        <!-- Source of Assistance -->
                        <div class="mt-4">
                          <label class="fw-bold">Source of Assistance</label>
                          <div class="checkbox-group-inline mt-2" style="display: flex; flex-wrap: wrap; gap: 25px; align-items: center;">
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="Regular Funds"
                                ${application.assistance_source === "Regular Funds" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Regular Funds
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="Donation"
                                ${application.assistance_source === "Donation" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Donation
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="AICS"
                                ${application.assistance_source === "AICS" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              AICS
                            </label>
                            
                            <!-- Others with text box group -->
                            <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 300px;">
                              <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                                <input
                                  type="checkbox"
                                  name="assistance_source"
                                  value="Others"
                                  ${application.assistance_source === "Others" ? "checked" : ""}
                                  disabled
                                  style="margin-right: 8px;"
                                >
                                Others
                              </label>
                              <input
                                type="text"
                                name="assistance_source_others_specify"
                                value="${application.assistance_source_others_specify || ''}"
                                readonly
                                class="form-control form-control-sm ${application.assistance_source === 'Others' ? '' : 'd-none'}"
                                placeholder="Please specify source..."
                                style="flex: 1; margin: 0; min-width: 200px;"
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-section mt-6">
                    <div class="form-grid">
                        <div class="form-row" style="border-bottom: none;">
                            <div class="form-group col-6">
                                <div class="signature-section">
                                    <div class="signature-box">
                                        ${
                                          application.signature_path
                                            ? `<img src="../${application.signature_path}" class="signature-image" alt="Client Signature">`
                                            : '<div class="signature-placeholder">No signature available</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            <small style="font-size: 10px; font-weight: bold;">Client's Signature</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="signature-section">
                                    <label style="font-size: 11px; font-weight: bold; margin-bottom: 0.5rem; display: block;">Interviewed by:</label>
                                    <div class="signature-box">
                                        ${
                                          application.staff_signature_path
                                            ? `<img src="../${application.staff_signature_path}" class="signature-image" alt="Social Worker Signature">`
                                            : '<div class="signature-placeholder">Signed by Social Worker</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            ${
                                              application.staff_full_name
                                                ? `<small style="font-size: 9px; display: block; font-weight: bold;">${application.staff_full_name}</small>`
                                                : ''
                                            }
                                            <small style="font-size: 9px; display: block;">Name/Signature of Social Worker</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">License Number: ${application.staff_license_number || '_______________'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group col-6">
                                <div class="signature-section">
                                    <label style="font-size: 11px; font-weight: bold; margin-bottom: 0.5rem; display: block;">Reviewed and Recommending Approval by:</label>
                                    <div class="signature-box" id="approver-signature-box">
                                        ${
                                          application.approver_signature_path
                                            ? `<img src="../${application.approver_signature_path}" class="signature-image" alt="Approver Signature">`
                                            : '<div class="signature-placeholder">Signed by Approver</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            <small id="approver-name-display" style="font-size: 9px; display: block; font-weight: bold;">${application.approver_name || 'No Name'}</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">Name/Signature of CSWDO Head</small>
                                        </div>
                                    </div>
                                    
                                    <label style="font-size: 11px; font-weight: bold; margin: 1rem 0 0.5rem 0; display: block;">Approved by:</label>
                                    <div class="signature-box">
                                        ${
                                          application.mayor_signature_path
                                            ? `<img src="../${application.mayor_signature_path}" class="signature-image" alt="Mayor Signature">`
                                            : '<div class="signature-placeholder">Pending Final Approval</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            <small id="mayor-name-display" style="font-size: 9px; display: block; font-weight: bold;">${application.mayor_name || 'No Name'}</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">City Mayor/Public Servant</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                     
                        <div class="form-row mt-3">
                            <div class="form-group col-6">
                                <label style="font-size: 11px; font-weight: bold;">2. Name of Payee</label>
                                <input type="text" value="${application.payee_name || ""}" readonly style="width: 100%; border: 1px solid #000; padding: 0.25rem; font-size: 11px;">
                            </div>
                            <div class="form-group col-6">
                                <label style="font-size: 11px; font-weight: bold;">3. Address of Payee</label>
                                <input type="text" value="${application.payee_address || ""}" readonly style="width: 100%; border: 1px solid #000; padding: 0.25rem; font-size: 11px;">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h6 class="section-title">Submitted Documents</h6>
                    <div id="submitted-documents">
                        ${application.documents && application.documents.length > 0 
                            ? `<div class="row g-3">
                                ${application.documents.map(doc => `
                                    <div class="col-md-6">
                                        <div class="document-item border rounded p-3">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 class="mb-1">${doc.file_name}</h6>
                                                    <small class="text-muted">
                                                        <i class="bi bi-calendar me-1"></i>
                                                        ${this.formatDate(doc.uploaded_at)}
                                                    </small>
                                                </div>
                                                <div class="btn-group">
                                                <button 
                                                    class="btn btn-sm btn-outline-primary view-document-btn" 
                                                    data-file-path="../${doc.file_path}" 
                                                    data-file-name="${doc.file_name}">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <a href="../${doc.file_path}" download class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-download"></i>
                                                </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                            : `<div class="text-center text-muted py-4">
                                <i class="bi bi-files" style="font-size: 2rem;"></i>
                                <p class="mt-2">No documents uploaded</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        `
        const financialOthersCheckbox = document.querySelector('input[name="financial_type"][value="Others"]');
        const financialSpecifyInput = document.querySelector('input[name="financial_others_specify"]');
        if (financialOthersCheckbox && financialSpecifyInput) {
          financialOthersCheckbox.addEventListener('change', () => {
            if (financialOthersCheckbox.checked) {
              financialSpecifyInput.classList.remove('d-none');
              financialSpecifyInput.removeAttribute('readonly');
            } else {
              financialSpecifyInput.classList.add('d-none');
              financialSpecifyInput.value = '';
            }
          });
        }
        const assistanceSourceOthersCheckbox = document.querySelector('input[name="assistance_source"][value="Others"]');
        const assistanceSourceSpecifyInput = document.querySelector('input[name="assistance_source_others_specify"]');
        if (assistanceSourceOthersCheckbox && assistanceSourceSpecifyInput) {
          assistanceSourceOthersCheckbox.addEventListener('change', () => {
            if (assistanceSourceOthersCheckbox.checked) {
              assistanceSourceSpecifyInput.classList.remove('d-none');
              assistanceSourceSpecifyInput.removeAttribute('readonly');
            } else {
              assistanceSourceSpecifyInput.classList.add('d-none');
              assistanceSourceSpecifyInput.value = '';
            }
          });
        }
        const referralCheckbox = document.querySelector('input[name="service_type_nature"][value="Referral"]');
        const referralSpecifyInput = document.querySelector('input[name="service_nature_referral_specify"]');
        if (referralCheckbox && referralSpecifyInput) {
          referralCheckbox.addEventListener('change', () => {
            if (referralCheckbox.checked) {
              referralSpecifyInput.classList.remove('d-none');
              referralSpecifyInput.removeAttribute('readonly');
            } else {
              referralSpecifyInput.classList.add('d-none');
              referralSpecifyInput.value = '';
            }
          });
        }

        // 🔄 Show/hide 'Others Specify' input dynamically for service type nature
        const serviceOthersCheckbox = document.querySelector('input[name="service_type_nature"][value="Others"]');
        const serviceOthersSpecifyInput = document.querySelector('input[name="service_nature_others_specify"]');
        if (serviceOthersCheckbox && serviceOthersSpecifyInput) {
          serviceOthersCheckbox.addEventListener('change', () => {
            if (serviceOthersCheckbox.checked) {
              serviceOthersSpecifyInput.classList.remove('d-none');
              serviceOthersSpecifyInput.removeAttribute('readonly');
            } else {
              serviceOthersSpecifyInput.classList.add('d-none');
              serviceOthersSpecifyInput.value = '';
            }
          });
        }

        const materialOthersCheckbox = document.querySelector('input[name="material_assistance"][value="Others"]');
        const materialSpecifyInput = document.querySelector('input[name="material_others_specify"]');
        if (materialOthersCheckbox && materialSpecifyInput) {
          materialOthersCheckbox.addEventListener('change', () => {
            if (materialOthersCheckbox.checked) {
              materialSpecifyInput.classList.remove('d-none');
              materialSpecifyInput.removeAttribute('readonly');
            } else {
              materialSpecifyInput.classList.add('d-none');
              materialSpecifyInput.value = '';
            }
          });
        }

  }
  renderClientIdentifyingSection(application) {
    return `
                        <div class="form-row">
                            <div class="form-group col-11">
                                <label>1. Client's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" name="client_last_name" value="${application.client_last_name || ''}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_first_name" value="${application.client_first_name || ''}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_middle_name" value="${application.client_middle_name || ''}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_extension" value="${application.client_extension || ''}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_sex" value="Male" ${application.client_sex === "Male" ? "checked" : ""} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_sex" value="Female" ${application.client_sex === "Female" ? "checked" : ""} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" name="client_dob_year" value="${this.formatDateForForm(application.client_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" name="client_dob_month" value="${this.formatDateForForm(application.client_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" name="client_dob_day" value="${this.formatDateForForm(application.client_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" name="client_address" value="${application.client_address || ''}" readonly>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>5. Place of Birth</label>
                                <input type="text" name="client_place_of_birth" value="${application.client_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>6. Relationship to Beneficiary</label>
                                <input type="text" name="relationship_to_beneficiary" value="${application.relationship_to_beneficiary || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>7. Civil Status</label>
                                <input type="text" name="civil_status" value="${application.civil_status || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>8. Religion</label>
                                <input type="text" name="religion" value="${application.religion || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>9. Nationality</label>
                                <input type="text" name="nationality" value="${application.nationality || 'Filipino'}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>10. Highest Educational Attainment</label>
                                <input type="text" name="education" value="${application.education || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>11. Skills/Occupation*</label>
                                <input type="text" name="occupation" value="${application.occupation || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>12. Estimated Monthly Income</label>
                                <div class="income-field">
                                    <span>₱</span>
                                    <input type="text" name="monthly_income" value="${application.monthly_income || ''}" readonly>

                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-3">
                                <label>13. PhilHealth No.</label>
                                <input type="text" name="philhealth_no" value="${application.philhealth_no || ''}" readonly>
                            </div>
                            <div class="form-group col-2">
                                <label>14. Mode of Admission*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="admission_mode" value="Online" ${application.admission_mode === "Online" ? "checked" : ""} disabled> Online
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="admission_mode" value="Referral" ${application.admission_mode === "Referral" ? "checked" : ""} disabled> Referral
                                    </label>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>15. Referring party</label>
                                <input type="text" name="referring_party" value="${application.referring_party || ''}" readonly>
                            </div>
                            <div class="form-group col-3">
                                <label class="mt-1">16. Contact #</label>
                                <input type="text" name="contact_number" value="${application.contact_number || ''}" readonly>
                            </div>
                        </div>
    `
  }

  renderBeneficiaryIdentifyingSection(application) {
    return `
                        <div class="form-row">
                            <div class="form-group col-12">
                                <div class="category-checkboxes">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Informal Settler Family" ${application.category === "Informal Settler Family" ? "checked" : ""} disabled> Informal Settler Family
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Disadvantaged Individual" ${application.category === "Disadvantaged Individual" ? "checked" : ""} disabled> Disadvantaged Individual
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Indigenous People" ${application.category === "Indigenous People" ? "checked" : ""} disabled> Indigenous People
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Pantawid Beneficiary" ${application.category === "Pantawid Beneficiary" ? "checked" : ""} disabled> Pantawid Beneficiary
                                    </label>
                                    ${application.category === 'Pantawid Beneficiary' ? `
                                        <div class="id-field">
                                            <span>ID No.</span>
                                            <input type="text" name="category_id_no" value="${application.category_id_no || ''}" readonly>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-11">
                                <label>1. Beneficiary's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_last_name" value="${application.beneficiary_last_name}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_first_name" value="${application.beneficiary_first_name}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_middle_name" value="${application.beneficiary_middle_name}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_extension" value="${application.beneficiary_extension}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="beneficiary_sex" value="Male" ${application.beneficiary_sex === "Male" ? "checked" : ""} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="beneficiary_sex" value="Female" ${application.beneficiary_sex === "Female" ? "checked" : ""} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" name="beneficiary_dob_year" value="${this.formatDateForForm(application.beneficiary_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" name="beneficiary_dob_month" value="${this.formatDateForForm(application.beneficiary_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" name="beneficiary_dob_day" value="${this.formatDateForForm(application.beneficiary_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" name="beneficiary_address" value="${application.beneficiary_address || ''}" readonly>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-8">
                                <label>5. Place of Birth</label>
                                <input type="text" name="beneficiary_place_of_birth" value="${application.beneficiary_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>6. Civil Status</label>
                                <input type="text" name="beneficiary_civil_status" value="${application.beneficiary_civil_status || ''}" readonly>
                            </div>
                        </div>
    `
  }

  renderFamilyRows(familyMembers) {
      if (!familyMembers || familyMembers.length === 0) {
          return `
              <tr>
                  <td colspan="8" class="text-center text-muted py-3">No family members listed</td>
              </tr>
          `;
      }
      
      // Create 5 rows minimum
      const rows = [];
      for (let i = 0; i < Math.max(5, familyMembers.length); i++) {
          const member = familyMembers[i] || {};
          rows.push(`
              <tr>
                  <td><input type="text" name="full_name" value="${member.full_name || ''}" readonly></td>
                  <td><input type="text" name="sex" value="${member.sex || ''}" readonly></td>
                  <td><input type="text" name="birthdate" value="${member.birthdate ? this.formatDateForForm(member.birthdate, 'full') : ''}" readonly></td>
                  <td><input type="text" name="civil_status" value="${member.civil_status || ''}" readonly></td>
                  <td><input type="text" name="relationship" value="${member.relationship || ''}" readonly></td>
                  <td><input type="text" name="education" value="${member.education || ''}" readonly></td>
                  <td><input type="text" name="occupation" value="${member.occupation || ''}" readonly></td>
                  <td><input type="text" name="monthly_income" value="${member.monthly_income || ''}" readonly></td>
              </tr>
          `);
      }
      return rows.join('');
  }

  formatDateForForm(dateString, part) {
    if (!dateString) return ""
    const date = new Date(dateString)
    if (part === "year") return date.getFullYear().toString()
    if (part === "month") return (date.getMonth() + 1).toString().padStart(2, "0")
    if (part === "day") return date.getDate().toString().padStart(2, "0")
    if (part === "full")
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
    return ""
  }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        })
    }
    getBeneficiariesExportFilename() {
        const fromDate = this.currentFilters.from_date;
        const toDate = this.currentFilters.to_date;
        
        // Check if using default "all" filter
        if (fromDate === '2020-01-01') {
            // Use current date format: YYYY-MM-DD.csv
            return `beneficiaries_${this.formatLocalDate(new Date())}.csv`;
        } else {
            // Use date range format: YYYY-MM-DD_to_YYYY-MM-DD.csv
            return `beneficiaries_${fromDate}_to_${toDate}.csv`;
        }
    }

    // THEN ADD THIS METHOD
    exportBeneficiariesCSV() {
        try {
            // Get filtered beneficiaries
            let beneficiaries = this.allBeneficiaries || [];

            if (this.searchQuery) {
                beneficiaries = beneficiaries.filter(b =>
                    b.reference_no.toLowerCase().includes(this.searchQuery) ||
                    b.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
                );
            }

            if (beneficiaries.length === 0) {
                this.showError('No data to export');
                return;
            }

            // Create CSV header
            const headers = ['Date Approved', 'Reference Number', 'Beneficiary Name', 'Type of Assistance', 'Email'];
            
            // Create CSV rows
            const rows = beneficiaries.map(b => [
                this.formatDate(b.updated_at),
                b.reference_no,
                b.beneficiary_full_name,
                b.service_name,
                b.email
            ]);

            // Combine headers and rows
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Generate filename based on filters
            const filename = this.getBeneficiariesExportFilename();

            // Create and download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Beneficiaries data exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export beneficiaries data');
        }
    }

}

// Initialize when DOM is loaded
let adminAnalytics;
document.addEventListener('DOMContentLoaded', () => {
    adminAnalytics = new AdminAnalytics();
});