// Admin dashboard functionality
class AdminDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupCharts();
        this.loadRecentActivities();
        
        // Refresh data every 30 seconds
        setInterval(() => this.loadDashboardData(), 30000);
    }

    async loadDashboardData() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/dashboard-stats.php');
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
        document.getElementById('total-applicants').textContent = data.total_applicants || 0;
        document.getElementById('total-interviewees').textContent = data.total_interviewees || 0;
        document.getElementById('total-beneficiaries').textContent = data.total_beneficiaries || 0;
        document.getElementById('approved-today').textContent = data.approved_today || 0;
    }

    setupCharts() {
        // Programs Chart
        const programsCtx = document.getElementById('programsChart');
        if (programsCtx) {
            this.charts.programs = new Chart(programsCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Applications',
                        data: [],
                        backgroundColor: 'rgba(13, 110, 253, 0.8)',
                        borderColor: 'rgba(13, 110, 253, 1)',
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
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

        // Status Chart
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Approved', 'Rejected', 'Waiting', 'Ready'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#ffc107',
                            '#198754',
                            '#dc3545',
                            '#0dcaf0',
                            '#20c997'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Monthly Chart
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            this.charts.monthly = new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Approvals',
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
                            display: false
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
    }

    updateCharts(data) {
        // Update programs chart
        if (this.charts.programs && data.programs_data) {
            this.charts.programs.data.labels = data.programs_data.map(p => p.name);
            this.charts.programs.data.datasets[0].data = data.programs_data.map(p => p.count);
            this.charts.programs.update();
        }

        // Update status chart
        if (this.charts.status && data.status_data) {
            this.charts.status.data.datasets[0].data = [
                data.status_data.pending || 0,
                data.status_data.approved || 0,
                data.status_data.rejected || 0,
                data.status_data.waiting || 0,
                data.status_data.ready || 0
            ];
            this.charts.status.update();
        }

        // Update monthly chart
        if (this.charts.monthly && data.monthly_data) {
            this.charts.monthly.data.labels = data.monthly_data.map(m => m.month);
            this.charts.monthly.data.datasets[0].data = data.monthly_data.map(m => m.count);
            this.charts.monthly.update();
        }
    }

    async loadRecentActivities() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/recent-activities.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderRecentActivities(result.data);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    renderRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-clock-history" style="font-size: 2rem;"></i>
                    <p class="mt-2">No recent activities</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${this.getActivityIconClass(activity.type)}">
                    <i class="bi ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content flex-grow-1">
                    <div class="activity-title">${activity.description}</div>
                    <small class="text-muted">${this.formatTimeAgo(activity.created_at)}</small>
                </div>
            </div>
        `).join('');
    }

    getActivityIconClass(type) {
        const classMap = {
            'application_submitted': 'info',
            'application_approved': 'success',
            'application_rejected': 'danger',
            'user_created': 'success',
            'status_updated': 'info'
        };
        return classMap[type] || 'info';
    }

    getActivityIcon(type) {
        const iconMap = {
            'application_submitted': 'bi-file-earmark-plus',
            'application_approved': 'bi-check-circle',
            'application_rejected': 'bi-x-circle',
            'user_created': 'bi-person-plus',
            'status_updated': 'bi-arrow-repeat'
        };
        return iconMap[type] || 'bi-info-circle';
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});