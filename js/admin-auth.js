// Admin authentication and session management
class AdminAuth {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupLogout();
        this.setupSidebar();
        this.updateUserInfo();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    checkAuthentication() {
        const userRole = sessionStorage.getItem('user_role');
        const userName = sessionStorage.getItem('user_name');

        if (!userRole || !userName) {
            window.location.href = '../login.html';
            return;
        }

        // Check if user has access to current page
        const currentPath = window.location.pathname;
        if (!this.hasPageAccess(userRole, currentPath)) {
            window.location.href = '../login.html';
            return;
        }
    }

    hasPageAccess(role, path) {
        const roleAccess = {
            'admin': ['/admin/', '/admin/dashboard.html', '/admin/applicants.html', '/admin/interviewees.html', '/admin/beneficiaries.html', '/admin/analytics.html', '/admin/manage_accounts.html'],
            'approver': ['/approver/', '/approver/dashboard.html', '/approver/applicants.html', '/approver/beneficiaries.html', '/approver/accounts.html'],
            'citymayor': ['/citymayor/', '/citymayor/dashboard.html', '/citymayor/applicants.html', '/citymayor/beneficiaries.html']
        };

        const allowedPaths = roleAccess[role] || [];
        return allowedPaths.some(allowedPath => path.includes(allowedPath));
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    logout() {
        // Clear session data
        sessionStorage.removeItem('user_role');
        sessionStorage.removeItem('user_name');
        
        // Redirect to login
        window.location.href = '../login.html';
    }

    setupSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }

        // Auto-collapse on mobile
        if (window.innerWidth <= 768) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('expanded');
        }
    }

    updateUserInfo() {
        const userName = sessionStorage.getItem('user_name');
        const userNameElement = document.getElementById('user-name');
        
        if (userNameElement && userName) {
            userNameElement.textContent = userName.charAt(0).toUpperCase() + userName.slice(1);
        }
    }

    updateTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const userRole = sessionStorage.getItem('user_role');
        const userName = sessionStorage.getItem('user_name');

        if (!userRole || !userName) {
            this.logout();
            return null;
        }

        // Start with authentication headers only
        const authHeaders = {
            'X-User-Role': userRole,
            'X-User-Name': userName
        };

        // Merge options
        const mergedOptions = {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers  // Options headers take precedence
            }
        };

        // Only set default Content-Type if not already set and body is not FormData
        if (mergedOptions.body && !mergedOptions.headers['Content-Type']) {
            if (mergedOptions.body instanceof FormData) {
                // Let browser set Content-Type for FormData (includes boundary)
                delete mergedOptions.headers['Content-Type'];
            } else {
                // Default to JSON for other body types
                mergedOptions.headers['Content-Type'] = 'application/json';
            }
        }

        try {
            const response = await fetch(url, mergedOptions);
            
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return response;
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }
}

// Global auth instance
window.adminAuth = new AdminAuth();