// Global utility functions for auto-refresh and notifications
class AutoRefreshManager {
    constructor() {
        this.indicators = new Map();
        this.refreshCallbacks = new Map();
    }

    register(pageId, callback, interval = 30000) {
        // Clear existing interval if any
        if (this.refreshCallbacks.has(pageId)) {
            clearInterval(this.refreshCallbacks.get(pageId));
        }

        // Set up new interval
        const intervalId = setInterval(() => {
            this.showRefreshIndicator(pageId);
            callback();
        }, interval);

        this.refreshCallbacks.set(pageId, intervalId);
    }

    showRefreshIndicator(pageId) {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.auto-refresh-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'auto-refresh-indicator';
        indicator.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Refreshing data...';
        
        document.body.appendChild(indicator);
        
        // Show indicator
        setTimeout(() => indicator.classList.add('show'), 100);
        
        // Hide indicator after 2 seconds
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    unregister(pageId) {
        if (this.refreshCallbacks.has(pageId)) {
            clearInterval(this.refreshCallbacks.get(pageId));
            this.refreshCallbacks.delete(pageId);
        }
    }

    unregisterAll() {
        this.refreshCallbacks.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        this.refreshCallbacks.clear();
    }
}

// Global auto-refresh manager
window.autoRefreshManager = new AutoRefreshManager();

// Clean up intervals when page unloads
window.addEventListener('beforeunload', () => {
    window.autoRefreshManager.unregisterAll();
});

// Enhanced alert system
window.showAlert = function(message, type = 'info', duration = 5000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, duration);
};

// Enhanced date formatting
window.formatters = {
    date: (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    currency: (amount) => {
        return new Intl.NumberFormat('en-PH').format(amount || 0);
    },
    
    timeAgo: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
};