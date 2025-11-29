// Programs page functionality
class ProgramsPage {
    constructor() {
        this.init();
    }

    init() {
        this.loadPrograms();
    }

    async loadPrograms() {
        try {
            const response = await fetch('api/programs.php');
            const programs = await response.json();
            
            if (programs.success) {
                this.renderPrograms(programs.data);
            } else {
                this.showError('Failed to load programs');
            }
        } catch (error) {
            console.error('Error loading programs:', error);
            this.showError('Network error while loading programs');
        }
    }

    renderPrograms(programs) {
        const container = document.getElementById('programs-list');
        if (!container) return;

        container.innerHTML = programs.map(program => `
            <div class="col-12">
                <div class="card program-card shadow-sm mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-2 text-center">
                                <div class="program-icon bg-primary text-white mb-3">
                                    <i class="bi ${this.getProgramIcon(program.name)}"></i>
                                </div>
                            </div>
                            <div class="col-md-7">
                                <h4 class="card-title text-primary fw-bold">${program.name}</h4>
                                <p class="card-text text-muted mb-3">${program.description}</p>
                                
                                <h6 class="text-success mb-2">
                                    <i class="bi bi-list-check me-2"></i>Required Documents:
                                </h6>
                                <ul class="list-unstyled ms-3">
                                    ${this.formatRequirements(program.requirements)}
                                </ul>
                            </div>
                            <div class="col-md-3 d-flex align-items-center justify-content-center">
                                <a href="apply.html?service=${program.id}" class="btn btn-primary btn-lg w-100">
                                    <i class="bi bi-file-earmark-plus me-2"></i>
                                    Apply Now
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatRequirements(requirements) {
        if (!requirements) return '<li class="text-muted">No specific requirements listed</li>';
        
        const reqArray = requirements.split(',').map(req => req.trim());
        return reqArray.map(req => `
            <li class="mb-1">
                <i class="bi bi-check-circle-fill text-success me-2"></i>
                ${req}
            </li>
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
        const container = document.getElementById('programs-list');
        if (container) {
            container.innerHTML = `
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProgramsPage();
});