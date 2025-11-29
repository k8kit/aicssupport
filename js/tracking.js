// Application tracking functionality
class TrackingPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track form submission
        document.getElementById('track-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.trackApplication();
        });

        // Forgot reference form submission
        document.getElementById('forgot-ref-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendReferenceNumber();
        });
    }

    async trackApplication() {
        const referenceNumber = document.getElementById('reference-input').value.trim();
        
        if (!referenceNumber) {
            this.showAlert('Please enter your reference number', 'warning');
            return;
        }

        try {
            const response = await fetch('api/track.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reference_number: referenceNumber })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayApplicationDetails(result.data);
            } else {
                this.showNoResults(result.message || 'Application not found');
            }
        } catch (error) {
            console.error('Tracking error:', error);
            this.showAlert('Network error while tracking application', 'danger');
        }
    }

    async sendReferenceNumber() {
        const email = document.getElementById('email-input').value.trim();
        
        if (!email) {
            this.showAlert('Please enter your email address', 'warning');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showAlert('Please enter a valid email address', 'warning');
            return;
        }

        const submitBtn = document.querySelector('#forgot-ref-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

        try {
            const response = await fetch('api/track.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'forgot_reference',
                    email: email 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Reference number sent to your email address', 'success');
                document.getElementById('email-input').value = '';
            } else {
                this.showAlert(result.message || 'Email not found in our records', 'warning');
            }
        } catch (error) {
            console.error('Email error:', error);
            this.showAlert('Network error while sending email', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    displayApplicationDetails(application) {
        const resultsSection = document.getElementById('results-section');
        const detailsContainer = document.getElementById('application-details');

        detailsContainer.innerHTML = `
            <div class="card-header bg-primary text-white py-3">
                <h5 class="mb-0">
                    <i class="bi bi-file-earmark-text me-2"></i>
                    Application Details - ${application.reference_no}
                </h5>
            </div>

            <div class="card-body p-4">
                <!-- Centered Submission Date -->
                <div class="text-center mb-4">
                    <h6 class="text-muted mb-1">Date Submitted</h6>
                    <p class="fw-semibold fs-5 mb-0">${this.formatDate(application.created_at)}</p>
                </div>

                <hr>

                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="info-block p-3 border rounded bg-light h-100">
                            <h6 class="text-primary mb-3"><i class="bi bi-person me-2"></i>Applicant Information</h6>
                            <p class="mb-1"><strong>Applicant Name:</strong> ${application.client_full_name}</p>
                            <p class="mb-1"><strong>Service Type:</strong> ${application.service_name || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="info-block p-3 border rounded bg-light h-100">
                            <h6 class="text-primary mb-3"><i class="bi bi-person-heart me-2"></i>Beneficiary Information</h6>
                            <p class="mb-1"><strong>Beneficiary Name:</strong> ${application.beneficiary_full_name}</p>
                            <p class="mb-1"><strong>Relationship to Applicant:</strong> ${application.relationship_to_beneficiary || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-5">
                    <h6 class="text-success text-center mb-3"><i class="bi bi-clock-history me-2"></i>Status Timeline</h6>
                    ${this.renderStatusTimeline(application.status)}
                </div>

                <div class="alert alert-info mt-4 text-center">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>What’s Next?</strong> ${this.getNextStepMessage(application.status)}
                </div>
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showNoResults(message) {
        const resultsSection = document.getElementById('results-section');
        const detailsContainer = document.getElementById('application-details');
        
        detailsContainer.innerHTML = `
            <div class="card-body text-center py-5">
                <i class="bi bi-search" style="font-size: 4rem; color: #6c757d;"></i>
                <h5 class="mt-3 text-muted">${message}</h5>
                <p class="text-muted">Please check your reference number and try again.</p>
                <div class="text-center">
                    <a href="apply.html" class="btn btn-primary">
                    <i class="bi bi-plus-circle me-2"></i>Submit New Application
                    </a>
                </div>
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ✅ Updated Timeline with New Statuses
    renderStatusTimeline(currentStatus) {
        const statuses = [
            { key: 'Pending for approval', label: 'Application Submitted', icon: 'bi-check-circle' },
            { key: 'Approved', label: 'Initial Approval', icon: 'bi-person-check' },
            { key: 'Waiting for approval of head', label: 'Department Head Review', icon: 'bi-person-badge' },
            { key: 'Waiting for approval of city mayor', label: 'City Mayor Approval', icon: 'bi-building-check' },
            { key: 'Ready for release', label: 'Ready for Release', icon: 'bi-gift' },
            { key: 'Released', label: 'Assistance Released', icon: 'bi-box-seam' },
            { key: 'Rejected', label: 'Application Rejected', icon: 'bi-x-circle' }
        ];

        // If rejected → only show submission and rejection
        const timelineStatuses = currentStatus === 'Rejected'
            ? [statuses[0], statuses[6]]
            : statuses.slice(0, 6);

        const statusOrder = statuses.map(s => s.key);
        const currentIndex = statusOrder.indexOf(currentStatus);

        return `
            <div class="timeline-wrapper mt-4">
                <div class="timeline-track position-relative d-flex justify-content-between align-items-center flex-wrap">
                    ${timelineStatuses.map((status, index) => {
                        const isCompleted = currentIndex > index;
                        const isActive = currentStatus === status.key;
                        let circleClass = 'timeline-circle bg-secondary';
                        if (isCompleted) circleClass = 'timeline-circle bg-success';
                        if (isActive) circleClass = 'timeline-circle bg-primary pulse';

                        return `
                            <div class="timeline-step text-center flex-fill">
                                <div class="${circleClass}">
                                    <i class="bi ${status.icon} text-white"></i>
                                </div>
                                <div class="timeline-label mt-2">
                                    <small class="fw-semibold d-block">${status.label}</small>
                                    ${isActive ? '<small class="text-primary">Current</small>' : isCompleted ? '<small class="text-success">Done</small>' : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const statusMap = {
            'Pending for approval': 'bg-warning text-dark',
            'Approved': 'bg-success',
            'Waiting for approval of head': 'bg-info text-dark',
            'Waiting for approval of city mayor': 'bg-info',
            'Ready for release': 'bg-primary',
            'Released': 'bg-success',
            'Rejected': 'bg-danger'
        };
        return statusMap[status] || 'bg-secondary';
    }

    getStatusIcon(status) {
        const iconMap = {
            'Pending for approval': 'bi-clock',
            'Approved': 'bi-check-circle',
            'Waiting for approval of head': 'bi-person-badge',
            'Waiting for approval of city mayor': 'bi-building-check',
            'Ready for release': 'bi-gift',
            'Released': 'bi-box-seam',
            'Rejected': 'bi-x-circle'
        };
        return iconMap[status] || 'bi-clock';
    }

    // ✅ Updated next step messages
    getNextStepMessage(status) {
        const messages = {
            'Pending for approval': 'Your application is under review. Please wait for further updates.',
            'Approved': 'Your application passed the initial review and you may proceed for interview scheduling. Check your email for further details.',
            'Waiting for approval of head': 'Your application is currently being reviewed by the department head.',
            'Waiting for approval of city mayor': 'Your application has been forwarded to the city mayor for final approval.',
            'Ready for release': 'Your assistance is approved and ready for release. You will be contacted for claiming details.',
            'Released': 'Your assistance has been successfully released. Thank you!',
            'Rejected': 'Unfortunately, your application was not approved. Please check your email for the reason of rejection. You may submit a new one if your circumstances have changed.'
        };
        return messages[status] || 'We are processing your application. Please check back later.';
    }

    // Utility functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showAlert(message, type) {
        const existingAlert = document.querySelector('.alert-custom');
        if (existingAlert) existingAlert.remove();

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
        alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrackingPage();
});
