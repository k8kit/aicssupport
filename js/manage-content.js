// Manage Content Updates JavaScript
class ContentManager {
    constructor() {
        this.currentContentId = null;
        this.currentFaqId = null;
        this.deleteType = null; // 'content' or 'faq'
        this.contentModal = null;
        this.faqModal = null;
        this.deleteModal = null;
        this.init();
    }

    init() {
        this.contentModal = new bootstrap.Modal(document.getElementById('contentModal'));
        this.faqModal = new bootstrap.Modal(document.getElementById('faqModal'));
        this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        
        this.setupEventListeners();
        this.loadContentUpdates();
        this.loadFaqs();
        this.updateTime();
    }

    setupEventListeners() {
        // Section tabs
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Content form submission
        document.getElementById('contentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContent();
        });

        // FAQ form submission
        document.getElementById('faqForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFaq();
        });

        // Add new content button
        document.getElementById('addNewBtn').addEventListener('click', () => {
            this.resetContentForm();
            document.getElementById('modalTitle').textContent = 'Add New Content';
        });

        // Add new FAQ button
        document.getElementById('addNewFaqBtn').addEventListener('click', () => {
            this.resetFaqForm();
            document.getElementById('faqModalTitle').textContent = 'Add New FAQ';
        });

        // Image preview
        document.getElementById('image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Delete confirmation
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            if (this.deleteType === 'content') {
                this.deleteContent(this.currentContentId);
            } else if (this.deleteType === 'faq') {
                this.deleteFaq(this.currentFaqId);
            }
        });
    }

    switchSection(section) {
        // Update tabs
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.section-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');
    }

    // ===== CONTENT UPDATES METHODS =====
    async loadContentUpdates() {
        try {
            const response = await fetch('../api/admin/content_updates.php');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('Failed to parse JSON. Response was:', text);
                throw new Error('Server returned invalid JSON. Check browser console for details.');
            }

            if (result.success) {
                this.renderContentTable(result.data);
            } else {
                if (result.message && result.message.includes('Authentication')) {
                    this.showAlert('Session expired. Redirecting to login...', 'warning');
                    setTimeout(() => {
                        window.location.href = result.redirect || '../login.php';
                    }, 2000);
                } else {
                    this.showAlert(result.message || 'Failed to load content', 'danger');
                }
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showAlert(`Error: ${error.message}. Check browser console for details.`, 'danger');
            
            document.getElementById('contentTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
                        Failed to load content. Please refresh the page or contact support.
                    </td>
                </tr>
            `;
        }
    }

    renderContentTable(contents) {
        const tbody = document.getElementById('contentTableBody');
        
        if (!contents || contents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No content updates yet. Click "Add New Content" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = contents.map(content => `
            <tr>
                <td>
                    <img src="../${content.image_path}" 
                         alt="${this.escapeHtml(content.title)}" 
                         class="content-preview-img"
                         onerror="this.src='../uploads/placeholder.jpg'">
                </td>
                <td>
                    <strong>${this.escapeHtml(content.title)}</strong>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 300px;" 
                         title="${this.escapeHtml(content.description)}">
                        ${this.escapeHtml(content.description)}
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${content.display_order}</span>
                </td>
                <td>
                    ${content.is_active ? 
                        '<span class="badge bg-success">Active</span>' : 
                        '<span class="badge bg-secondary">Inactive</span>'
                    }
                </td>
                <td>
                    <small class="text-muted">
                        ${this.formatDate(content.created_at)}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                onclick="contentManager.editContent(${content.id})"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" 
                                onclick="contentManager.confirmDeleteContent(${content.id})"
                                title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async editContent(id) {
        try {
            const response = await fetch(`../api/admin/content_updates.php?id=${id}`);
            const result = await response.json();

            if (result.success && result.data) {
                const content = result.data;
                
                document.getElementById('content_id').value = content.id;
                document.getElementById('title').value = content.title;
                document.getElementById('description').value = content.description;
                document.getElementById('display_order').value = content.display_order;
                document.getElementById('is_active').checked = content.is_active == 1;

                document.getElementById('imagePreview').innerHTML = `
                    <div class="position-relative d-inline-block">
                        <img src="../${content.image_path}" 
                             class="modal-preview-img border"
                             alt="Current image">
                        <div class="mt-2 text-muted small">
                            <i class="bi bi-info-circle me-1"></i>Upload a new image to replace
                        </div>
                    </div>
                `;

                document.getElementById('image').removeAttribute('required');
                document.getElementById('modalTitle').textContent = 'Edit Content';
                this.contentModal.show();
            } else {
                this.showAlert('Failed to load content details', 'danger');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showAlert('Network error', 'danger');
        }
    }

    async saveContent() {
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            const formData = new FormData(document.getElementById('contentForm'));
            const contentId = document.getElementById('content_id').value;

            const url = contentId ? 
                `../api/admin/content_updates.php?id=${contentId}` : 
                '../api/admin/content_updates.php';

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(
                    contentId ? 'Content updated successfully!' : 'Content created successfully!', 
                    'success'
                );
                this.contentModal.hide();
                this.resetContentForm();
                this.loadContentUpdates();
            } else {
                this.showAlert(result.message || 'Failed to save content', 'danger');
            }
        } catch (error) {
            console.error('Error saving content:', error);
            this.showAlert('Network error while saving', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    confirmDeleteContent(id) {
        this.currentContentId = id;
        this.deleteType = 'content';
        document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this content?';
        this.deleteModal.show();
    }

    async deleteContent(id) {
        try {
            const response = await fetch(`../api/admin/content_updates.php?id=${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Content deleted successfully!', 'success');
                this.deleteModal.hide();
                this.loadContentUpdates();
            } else {
                this.showAlert(result.message || 'Failed to delete content', 'danger');
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            this.showAlert('Network error while deleting', 'danger');
        }
    }

    resetContentForm() {
        document.getElementById('contentForm').reset();
        document.getElementById('content_id').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('image').setAttribute('required', 'required');
        document.getElementById('is_active').checked = true;
    }

    // ===== FAQ METHODS =====
    async loadFaqs() {
        try {
            const response = await fetch('../api/admin/faqs.php');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                this.renderFaqTable(result.data);
            } else {
                this.showAlert(result.message || 'Failed to load FAQs', 'danger');
            }
        } catch (error) {
            console.error('Error loading FAQs:', error);
            this.showAlert(`Error: ${error.message}`, 'danger');
            
            document.getElementById('faqTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
                        Failed to load FAQs. Please refresh the page or contact support.
                    </td>
                </tr>
            `;
        }
    }

    renderFaqTable(faqs) {
        const tbody = document.getElementById('faqTableBody');
        
        if (!faqs || faqs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No FAQs yet. Click "Add New FAQ" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = faqs.map(faq => `
            <tr>
                <td>
                    <strong>${this.escapeHtml(faq.question)}</strong>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 250px;" 
                         title="${this.escapeHtml(faq.answer)}">
                        ${this.escapeHtml(faq.answer)}
                    </div>
                </td>
                <td>
                    <span class="badge bg-info">${this.escapeHtml(faq.category)}</span>
                </td>
                <td>
                    <span class="badge bg-secondary">${faq.display_order}</span>
                </td>
                <td>
                    ${faq.is_active ? 
                        '<span class="badge bg-success">Active</span>' : 
                        '<span class="badge bg-secondary">Inactive</span>'
                    }
                </td>
                <td>
                    <small class="text-muted">
                        ${this.formatDate(faq.created_at)}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                onclick="contentManager.editFaq(${faq.id})"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" 
                                onclick="contentManager.confirmDeleteFaq(${faq.id})"
                                title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async editFaq(id) {
        try {
            const response = await fetch(`../api/admin/faqs.php?id=${id}`);
            const result = await response.json();

            if (result.success && result.data) {
                const faq = result.data;
                
                document.getElementById('faq_id').value = faq.id;
                document.getElementById('faq_question').value = faq.question;
                document.getElementById('faq_answer').value = faq.answer;
                document.getElementById('faq_category').value = faq.category;
                document.getElementById('faq_display_order').value = faq.display_order;
                document.getElementById('faq_is_active').checked = faq.is_active == 1;

                document.getElementById('faqModalTitle').textContent = 'Edit FAQ';
                this.faqModal.show();
            } else {
                this.showAlert('Failed to load FAQ details', 'danger');
            }
        } catch (error) {
            console.error('Error loading FAQ:', error);
            this.showAlert('Network error', 'danger');
        }
    }

    async saveFaq() {
        const submitBtn = document.getElementById('faqSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            const formData = new FormData(document.getElementById('faqForm'));
            const faqId = document.getElementById('faq_id').value;

            const url = faqId ? 
                `../api/admin/faqs.php?id=${faqId}` : 
                '../api/admin/faqs.php';

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(
                    faqId ? 'FAQ updated successfully!' : 'FAQ created successfully!', 
                    'success'
                );
                this.faqModal.hide();
                this.resetFaqForm();
                this.loadFaqs();
            } else {
                this.showAlert(result.message || 'Failed to save FAQ', 'danger');
            }
        } catch (error) {
            console.error('Error saving FAQ:', error);
            this.showAlert('Network error while saving', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    confirmDeleteFaq(id) {
        this.currentFaqId = id;
        this.deleteType = 'faq';
        document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this FAQ?';
        this.deleteModal.show();
    }

    async deleteFaq(id) {
        try {
            const response = await fetch(`../api/admin/faqs.php?id=${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('FAQ deleted successfully!', 'success');
                this.deleteModal.hide();
                this.loadFaqs();
            } else {
                this.showAlert(result.message || 'Failed to delete FAQ', 'danger');
            }
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            this.showAlert('Network error while deleting', 'danger');
        }
    }

    resetFaqForm() {
        document.getElementById('faqForm').reset();
        document.getElementById('faq_id').value = '';
        document.getElementById('faq_is_active').checked = true;
    }

    // ===== UTILITY METHODS =====
    previewImage(file) {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            this.showAlert('Image size must be less than 5MB', 'warning');
            document.getElementById('image').value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.showAlert('Please select a valid image file', 'warning');
            document.getElementById('image').value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreview').innerHTML = `
                <div class="position-relative d-inline-block">
                    <img src="${e.target.result}" 
                         class="modal-preview-img border"
                         alt="Preview">
                    <div class="mt-2 text-muted small">
                        <i class="bi bi-check-circle text-success me-1"></i>New image selected
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi ${this.getAlertIcon(type)} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = bootstrap.Alert.getInstance(alert);
                if (bsAlert) bsAlert.close();
                else alert.remove();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            danger: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-circle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const updateClock = () => {
                const now = new Date();
                timeElement.textContent = now.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            };
            updateClock();
            setInterval(updateClock, 1000);
        }
    }
}

// Initialize on DOM ready
let contentManager;
document.addEventListener('DOMContentLoaded', () => {
    contentManager = new ContentManager();
});