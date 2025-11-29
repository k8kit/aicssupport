// City Mayor dashboard functionality
class CityMayorDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupCharts();
        this.loadUrgentApplications();
        
        // Refresh data every 30 seconds
        setInterval(() => this.loadDashboardData(), 30000);
    }

    async loadDashboardData() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/citymayor/dashboard-stats.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.updateStatsCards(result.data);
                this.updateCharts(result.data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateStatsCards(data) {
        document.getElementById('awaiting-approval').textContent = data.awaiting_approval || 0;
        document.getElementById('approved-by-mayor').textContent = data.approved_by_mayor || 0;
        document.getElementById('approved-this-month').textContent = data.approved_this_month || 0;
    }

    setupCharts() {
        // Trends Chart
        const trendsCtx = document.getElementById('trendsChart');
        if (trendsCtx) {
            this.charts.trends = new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Applications Received',
                        data: [],
                        borderColor: 'rgba(13, 110, 253, 1)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Applications Approved',
                        data: [],
                        borderColor: 'rgba(25, 135, 84, 1)',
                        backgroundColor: 'rgba(25, 135, 84, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Program Distribution Chart
        const programCtx = document.getElementById('programChart');
        if (programCtx) {
            this.charts.program = new Chart(programCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#0d6efd',
                            '#198754',
                            '#dc3545',
                            '#ffc107',
                            '#0dcaf0',
                            '#6f42c1',
                            '#fd7e14',
                            '#20c997',
                            '#e83e8c'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        }
                    }
                }
            });
        }
    }

    updateCharts(data) {
        // Update trends chart
        if (this.charts.trends && data.trends_data) {
            this.charts.trends.data.labels = data.trends_data.map(t => t.month);
            this.charts.trends.data.datasets[0].data = data.trends_data.map(t => t.received);
            this.charts.trends.data.datasets[1].data = data.trends_data.map(t => t.approved);
            this.charts.trends.update();
        }

        // Update program chart
        if (this.charts.program && data.program_data) {
            this.charts.program.data.labels = data.program_data.map(p => p.name);
            this.charts.program.data.datasets[0].data = data.program_data.map(p => p.count);
            this.charts.program.update();
        }
    }

    async loadUrgentApplications() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/citymayor/urgent-applications.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderUrgentApplications(result.data);
                document.getElementById('urgent-count').textContent = result.data.length;
            }
        } catch (error) {
            console.error('Error loading urgent applications:', error);
        }
    }

    renderUrgentApplications(applications) {
        const tbody = document.getElementById('urgent-applications');
        if (!tbody) return;

        if (applications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-check-circle" style="font-size: 2rem; color: #198754;"></i>
                        <p class="mt-2">No urgent applications at this time</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = applications.map(app => `
            <tr class="${app.days_waiting > 7 ? 'table-warning' : ''}">
                <td>
                    <span class="fw-bold text-primary">${app.reference_no}</span>
                </td>
                <td>${app.client_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${app.service_name}</span>
                </td>
                <td>
                    <span class="badge ${app.days_waiting > 7 ? 'bg-danger' : app.days_waiting > 3 ? 'bg-warning' : 'bg-info'}">
                        ${app.days_waiting} days
                    </span>
                </td>
                <td>
                    <a href="applicants.html" class="btn btn-sm btn-primary">
                        <i class="bi bi-eye me-1"></i>Review
                    </a>
                </td>
            </tr>
        `).join('');
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CityMayorDashboard();
});