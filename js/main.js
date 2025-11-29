// Main JavaScript functionality for homepage
class MainApp {
    constructor() {
        this.init();
    }

    init() {
        this.loadPrograms();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    async loadPrograms() {
        try {
            const response = await fetch('api/programs.php');
            const programs = await response.json();
            
            if (programs.success) {
                this.renderProgramsGrid(programs.data);
            } else {
                this.showError('Failed to load programs');
            }
        } catch (error) {
            console.error('Error loading programs:', error);
            this.showError('Network error while loading programs');
        }
    }

    renderProgramsGrid(programs) {
        const grid = document.getElementById('programs-grid');
        if (!grid) return;

        grid.innerHTML = programs.map(program => `
            <div class="col-md-6 col-lg-4">
                <div class="card program-card h-100 shadow-sm">
                    <div class="card-body text-center p-4">
                        <div class="program-icon bg-primary text-white mb-3">
                            <i class="bi ${this.getProgramIcon(program.name)}"></i>
                        </div>
                        <h5 class="card-title fw-bold">${program.name}</h5>
                        <p class="card-text text-muted">${program.description}</p>
                        <a href="apply.html?service=${program.id}" class="btn btn-outline-primary">
                            <i class="bi bi-arrow-right-circle me-2"></i>Apply Now
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getProgramIcon(programName) {
        const iconMap = {
            'Transportation Assistance': 'bi-car-front',
            'Medical Assistance': 'bi-heart-pulse',
            'Burial Assistance': 'bi-flower1',
            'PWD Assistance': 'bi-universal-access',
            'Issuance of Case Study Report (Medical Assistance)': 'bi-file-medical',
            'Issuance of Case Study Report (Financial Assistance)': 'bi-cash-stack',
            'Issuance of Case Study Report (Guarantee Letter)': 'bi-file-earmark-check',
            'Referral/Endorsement Letter for Consultation': 'bi-file-earmark-person',
            'Endorsement Letter for Laboratory Services & Minor Procedures': 'bi-file-earmark-medical'
        };
        
        return iconMap[programName] || 'bi-clipboard-heart';
    }

    showError(message) {
        const grid = document.getElementById('programs-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning text-center">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        ${message}
                    </div>
                </div>
            `;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MainApp();
});

// Utility functions
const utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    },

    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    showAlert: (message, type = 'info') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }
};

window.utils = utils;