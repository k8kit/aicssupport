// Admin beneficiaries management
class AdminBeneficiaries {
    constructor() {
        
        this.currentApplicationId = null;
        this.filterTimeout = null; // For debouncing filter changes
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.searchTimeout = null;
        this.filterTimeout = null; // For debouncing filter changes
        this.init();

    }

    init() {
        this.loadBeneficiaries();
        this.loadBeneficiariesStats();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadPrograms();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadBeneficiaries();
            this.loadBeneficiariesStats();
        }, 30000);
    }

    setupEventListeners() {
        // Notification modal
        document.getElementById('confirm-notification').addEventListener('click', () => {
            this.sendNotification();
        });

        // Release confirmation modal
        document.getElementById('confirm-release')?.addEventListener('click', () => {
            this.confirmRelease();
        });

        document.getElementById('program-filter').addEventListener('change', () => {
            this.applyFiltersWithDebounce();
        });

        document.getElementById('date-filter').addEventListener('change', () => {
            this.applyFiltersWithDebounce();
        });
        // ====== LIVE SEARCH (automatic typing filter) ======
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        if (searchInput) {
            // Debounced live search
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.trim().toLowerCase();
                    this.currentPage = 1; // reset to first page when searching
                    this.renderBeneficiariesTable(this.allBeneficiaries);
                    this.renderPaginationControls();
                }, 300); // wait 300ms after typing stops
            });

            // Optional: press Enter to search instantly
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(this.searchTimeout);
                    this.searchQuery = e.target.value.trim().toLowerCase();
                    this.currentPage = 1;
                    this.renderBeneficiariesTable(this.allBeneficiaries);
                    this.renderPaginationControls();
                }
            });
        }

        // Optional: click search icon to manually trigger filter
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput.value.trim().toLowerCase();
                this.currentPage = 1;
                this.renderBeneficiariesTable(this.allBeneficiaries);
                this.renderPaginationControls();
            });
        }

        // Modal actions
    }

    // Debounce filter changes to avoid too many API calls
    applyFiltersWithDebounce() {
        if (this.filterTimeout) {
            this.currentPage = 1;
            clearTimeout(this.filterTimeout);
        }
        
        this.filterTimeout = setTimeout(() => {
            this.loadBeneficiaries();
        }, 300); // Wait 300ms after last change
    }

    async loadBeneficiariesStats() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/beneficiaries-stats.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.updateStatsCards(result.data);
            }
        } catch (error) {
            console.error('Error loading beneficiaries stats:', error);
        }
    }

    updateStatsCards(data) {
        document.getElementById('ready-for-release').textContent = data.ready_for_release || 0;
        document.getElementById('released-today').textContent = data.released_today || 0;
        document.getElementById('released-this-week').textContent = data.released_this_week || 0;
        document.getElementById('released-this-month').textContent = data.released_this_month || 0;
    }
    async loadPrograms() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/programs.php');
            if (!response) {
                console.error('No response from programs API');
                return;
            }

            const result = await response.json();
            console.log('Programs API response:', result); // 🔍 Debug log
            
            if (result.success && result.data) {
                console.log('Programs data:', result.data); // 🔍 Debug log
                this.renderProgramFilter(result.data);
            } else {
                console.error('Programs API returned no data or failed');
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    renderProgramFilter(programs) {
        const filter = document.getElementById('program-filter');
        if (!filter) {
            console.error('program-filter element not found!');
            return;
        }

        console.log('Rendering program filter with:', programs); // 🔍 Debug log

        // Check if programs is an array
        if (!Array.isArray(programs)) {
            console.error('Programs is not an array:', programs);
            return;
        }

        // Check if programs array has items
        if (programs.length === 0) {
            console.warn('Programs array is empty');
            filter.innerHTML = '<option value="">All Programs</option><option disabled>No programs available</option>';
            return;
        }

        const options = programs.map(program => {
            console.log('Processing program:', program); // 🔍 Debug log
            return `<option value="${program.id}">${program.name || 'Unnamed Program'}</option>`;
        }).join('');

        filter.innerHTML = '<option value="">All Programs</option>' + options;
        console.log('Program filter rendered successfully'); // 🔍 Debug log
    }

    async loadBeneficiaries() {
        try {
            const filters = this.getFilters();
            console.log('Applying filters:', filters); // 🔍 Debug log
            
            const queryString = new URLSearchParams(filters).toString();
            console.log('Query string:', queryString); // 🔍 Debug log
            
            const response = await adminAuth.makeAuthenticatedRequest(
                `../api/admin/beneficiaries.php?${queryString}`
            );
            if (!response) return;

            const result = await response.json();
            console.log('Beneficiaries response:', result); // 🔍 Debug log
            
            if (result.success) {
                this.allBeneficiaries = result.data;
                this.renderBeneficiariesTable(result.data);
                this.renderPaginationControls();
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
            this.showError('Failed to load beneficiaries data');
        }
    }

    getFilters() {
        const programFilter = document.getElementById('program-filter');
        const dateFilter = document.getElementById('date-filter');
        
        const filters = {
            program: programFilter?.value || '',
            date: dateFilter?.value || ''
        };
        
        console.log('Current filter values:', filters); // 🔍 Debug log
        return filters;
    }


    renderBeneficiariesTable(beneficiaries) {
        const tbody = document.getElementById('beneficiaries-tbody');
        if (!tbody) return;

        let filtered = beneficiaries
        if (this.searchQuery) {
            filtered = filtered.filter(b => 
                b.reference_no.toLowerCase().includes(this.searchQuery) ||
                b.client_full_name.toLowerCase().includes(this.searchQuery)
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No beneficiaries found</p>
                    </td>
                </tr>
            `;
            return;
        }
        const startIndex = (this.currentPage - 1) * this.itemsPerPage
        const paginated = filtered.slice(startIndex, startIndex + this.itemsPerPage)

        tbody.innerHTML = paginated.map(beneficiary => `
        <tr>
            <td>${this.formatDate(beneficiary.updated_at)}</td>
            <td>
                    <span class="fw-bold text-primary">${beneficiary.reference_no}</span>
                </td>
                <td>${beneficiary.client_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${beneficiary.service_name}</span>
                </td>
                <td>
                    ${beneficiary.email}
                </td>
                <td>
                    <div class="btn-group" role="group">
                        ${beneficiary.status === 'Ready for release' ? `
                            <button class="btn btn-sm btn-outline-success action-btn" 
                                    onclick="adminBeneficiaries.notifyBeneficiary('${beneficiary.id}', '${beneficiary.email}')">
                                <i class="bi bi-envelope"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                                onclick="adminBeneficiaries.markAsReleased('${beneficiary.id}')">
                            <i class="bi bi-check-circle"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPaginationControls() {
        const totalItems = (this.allBeneficiaries || []).filter(i =>
            !this.searchQuery ||
            i.reference_no.toLowerCase().includes(this.searchQuery) ||
            i.client_full_name.toLowerCase().includes(this.searchQuery)
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
                this.renderBeneficiariesTable(this.allBeneficiaries)
                this.renderPaginationControls()
            }
        }

        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++
                this.renderBeneficiariesTable(this.allBeneficiaries)
                this.renderPaginationControls()
            }
        }
    }
  

    async notifyBeneficiary(applicationId, email) {
        this.currentApplicationId = applicationId;
        this.currentEmail = email;
        
        const modal = new bootstrap.Modal(document.getElementById('notificationModal'));
        modal.show();
    }

    async sendNotification() {
        if (!this.currentApplicationId) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/notify-beneficiary.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: this.currentApplicationId,
                    email: this.currentEmail
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
                modal.hide();
                this.showSuccess('Notification sent successfully');
            } else {
                this.showError(result.message || 'Failed to send notification');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showError('Network error while sending notification');
        }
    }

    async markAsReleased(applicationId) {
        // Store the application ID and show modal
        this.currentReleaseApplicationId = applicationId;
        
        const modal = new bootstrap.Modal(document.getElementById('releaseConfirmationModal'));
        modal.show();
    }

    async confirmRelease() {
        if (!this.currentReleaseApplicationId) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/mark-released.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: this.currentReleaseApplicationId
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('releaseConfirmationModal'));
                modal.hide();
                this.loadBeneficiaries();
                this.loadBeneficiariesStats();
                this.showSuccess('Application marked as released');
            } else {
                this.showError(result.message || 'Failed to mark as released');
            }
        } catch (error) {
            console.error('Error marking as released:', error);
            this.showError('Network error while updating status');
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getStatusClass(status) {
        const statusMap = {
            'Ready for release': 'ready',
            'Released': 'approved'
        };
        return statusMap[status] || 'ready';
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
}

// Global instance
let adminBeneficiaries;
document.addEventListener("click", function (e) {
  if (e.target.closest(".view-document-btn")) {
    const btn = e.target.closest(".view-document-btn");
    const filePath = btn.dataset.filePath;
    const fileName = btn.dataset.fileName;
    const modal = new bootstrap.Modal(document.getElementById("documentPreviewModal"));
    const previewContainer = document.getElementById("document-preview-content");

    // Determine file type
    const fileExtension = filePath.split('.').pop().toLowerCase();

    let previewHTML = "";
    if (["jpg", "jpeg", "png", "gif", "bmp"].includes(fileExtension)) {
      previewHTML = `<img src="${filePath}" alt="${fileName}" class="img-fluid rounded">`;
    } else if (["pdf"].includes(fileExtension)) {
      previewHTML = `
        <iframe src="${filePath}" width="100%" height="600px" style="border:none;"></iframe>
      `;
    } else {
      previewHTML = `
        <p class="text-muted">Preview not available for this file type.</p>
        <a href="${filePath}" target="_blank" class="btn btn-primary mt-2">Open File</a>
      `;
    }

    previewContainer.innerHTML = previewHTML;
    document.getElementById("documentPreviewLabel").innerText = fileName;
    modal.show();
  }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminBeneficiaries = new AdminBeneficiaries();
});