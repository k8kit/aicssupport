// Approver dashboard functionality
class ApproverDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupCharts();
        this.loadRecentApplications();
        
        // Refresh data every 30 seconds
        setInterval(() => this.loadDashboardData(), 30000);
    }

    async loadDashboardData() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/approver/dashboard-stats.php');
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
        document.getElementById('pending-review').textContent = data.pending_review || 0;
        document.getElementById('approved-applications').textContent = data.approved_applications || 0;
        document.getElementById('forwarded-mayor').textContent = data.forwarded_mayor || 0;
    }

    setupCharts() {
        // Approval Activity Chart
        const approvalCtx = document.getElementById('approvalChart');
        if (approvalCtx) {
            this.charts.approval = new Chart(approvalCtx, {
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
                    }, {
                        label: 'Rejections',
                        data: [],
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
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

        // Decision Distribution Chart
        const decisionCtx = document.getElementById('decisionChart');
        if (decisionCtx) {
            this.charts.decision = new Chart(decisionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Approved', 'Forwarded to Mayor', 'Rejected'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            '#198754',
                            '#0dcaf0',
                            '#dc3545'
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
    }

    updateCharts(data) {
        // Update approval chart
        if (this.charts.approval && data.approval_activity) {
            this.charts.approval.data.labels = data.approval_activity.map(a => a.date);
            this.charts.approval.data.datasets[0].data = data.approval_activity.map(a => a.approvals);
            this.charts.approval.data.datasets[1].data = data.approval_activity.map(a => a.rejections);
            this.charts.approval.update();
        }

        // Update decision chart
        if (this.charts.decision && data.decision_data) {
            this.charts.decision.data.datasets[0].data = [
                data.decision_data.approved || 0,
                data.decision_data.forwarded || 0,
                data.decision_data.rejected || 0
            ];
            this.charts.decision.update();
        }
    }

    async loadRecentApplications() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/approver/recent-applications.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderRecentApplications(result.data);
            }
        } catch (error) {
            console.error('Error loading recent applications:', error);
        }
    }

    renderRecentApplications(applications) {
        const tbody = document.getElementById('recent-applications');
        if (!tbody) return;

        if (applications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No applications pending review</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = applications.map(app => `
            <tr>
                <td>
                    <span class="fw-bold text-primary">${app.reference_no}</span>
                </td>
                <td>${app.client_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${app.service_name}</span>
                </td>
                <td>${this.formatDate(app.created_at)}</td>
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
    new ApproverDashboard();
});