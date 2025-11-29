// Login functionality
class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        // Login form submission
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Password toggle
        document.getElementById('toggle-password').addEventListener('click', () => {
            this.togglePassword();
        });

        // Update time
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('toggle-password');
        const icon = toggleBtn.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'bi bi-eye';
        }
    }

    async handleLogin() {
        const form = document.getElementById('login-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Validate form
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

        try {
            const formData = new FormData(form);
            const response = await fetch('api/auth.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Store session data
                sessionStorage.setItem('user_role', result.data.role);
                sessionStorage.setItem('user_name', result.data.username);
                sessionStorage.setItem('user_department', result.data.department); // ✅ Add this
                
                // Redirect based on role
                this.redirectToDashboard(result.data.role, result.data.department);
            } else {
                this.showError(result.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    redirectToDashboard(role, department) {
        if (role === 'admin') {
            if (department === 'CSWDO') {
                window.location.href = 'admin/dashboard_cswdo.html';
            } else if (department === 'AksyonBilis') {
                window.location.href = 'admin/dashboard_aksyonbilis.html';
            } else {
                this.showError('Unknown department.');
            }
        } else if (role === 'approver') {
            window.location.href = 'approver/dashboard.html';
        } else if (role === 'citymayor') {
            window.location.href = 'citymayor/dashboard.html';
        } else {
            this.showError('Invalid user role');
        }
    }
    checkExistingSession() {
        const userRole = sessionStorage.getItem('user_role');
        const userDepartment = sessionStorage.getItem('user_department');
        if (userRole) {
            this.redirectToDashboard(userRole);
        }
    }

    showError(message) {
        // Remove existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const form = document.getElementById('login-form');
        form.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    updateTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});