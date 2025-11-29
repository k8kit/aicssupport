class AdminAccounts {
    activityLogs = []; // store current logs for CSV
    currentUserId = null;
    currentFilters = { user_id: '', start_date: '', end_date: '' }; // Store filters for CSV export

    constructor() {
        this.init();
    }

    init() {
        this.loadUsers();
        this.loadUserFilter().then(() => this.loadActivity());

        this.setupEventListeners();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        setInterval(() => this.loadUsers(), 60000); // refresh users every 60s
        setInterval(() => this.loadActivity(), 60000); // refresh activity every 60s
    }

    setupEventListeners() {
        // Add user form
        document.getElementById('add-user-form').addEventListener('submit', e => {
            e.preventDefault();
            this.addUser();
        });

        // Edit user form
        document.getElementById('edit-user-form').addEventListener('submit', e => {
            e.preventDefault();
            this.updateUser();
        });

        // CSV export
        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }

        // Dynamic filter change
        ['userFilter','startDate','endDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                this.updateFilters();
                this.loadActivity(1);
            });
        });

        // Department field visibility based on role selection (Add User Modal)
        const addRoleSelect = document.querySelector('#add-user-form [name="role"]');
        const addDepartmentGroup = document.getElementById('add-department-group');
        if (addRoleSelect && addDepartmentGroup) {
            addRoleSelect.addEventListener('change', (e) => {
                this.toggleDepartmentField(e.target.value, addDepartmentGroup);
            });
        }

        // Department field visibility based on role selection (Edit User Modal)
        const editRoleSelect = document.querySelector('#edit-user-form [name="role"]');
        const editDepartmentGroup = document.getElementById('edit-department-group');
        if (editRoleSelect && editDepartmentGroup) {
            editRoleSelect.addEventListener('change', (e) => {
                this.toggleDepartmentField(e.target.value, editDepartmentGroup);
            });
        }

        // Reset department field when modals are hidden
        document.getElementById('addUserModal').addEventListener('hidden.bs.modal', () => {
            const addDeptGroup = document.getElementById('add-department-group');
            if (addDeptGroup) {
                addDeptGroup.style.display = 'none';
                addDeptGroup.querySelector('select').required = false;
                addDeptGroup.querySelector('select').value = '';
            }
        });
    }

    toggleDepartmentField(role, departmentGroup) {
        const select = departmentGroup.querySelector('select');
        console.log('toggleDepartmentField called:', { role, display: role === 'admin' ? 'block' : 'none' });
        if (role === 'admin') {
            departmentGroup.style.display = 'block';
            select.required = true;
            console.log('Department field shown, required set to true');
        } else {
            departmentGroup.style.display = 'none';
            select.required = false;
            select.value = '';
            console.log('Department field hidden');
        }
    }

    updateFilters() {
        this.currentFilters = {
            user_id: document.getElementById('userFilter').value,
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value
        };
    }

    // ------------------ Users ------------------
    async loadUsers() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php');
            if (!response) return;
            const result = await response.json();
            if (result.success) this.renderUsersTable(result.data);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users data');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
                <i class="bi bi-people" style="font-size:2rem;"></i>
                <p class="mt-2">No users found</p>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><span class="fw-bold">${user.username}</span></td>
                <td>${user.full_name}</td>
                <td><span class="badge ${this.getRoleBadgeClass(user.role)}">${this.formatRole(user.role)}</span></td>
                <td>${user.department ? `<span class="badge bg-info">${user.department}</span>` : '<span class="text-muted">-</span>'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="adminAccounts.editUser('${user.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="adminAccounts.toggleUserStatus('${user.id}', ${user.is_active})">
                            <i class="bi ${user.is_active ? 'bi-pause' : 'bi-play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminAccounts.deleteUser('${user.id}')" ${user.username === 'admin' ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async addUser() {
        const form = document.getElementById('add-user-form');
        const formData = new FormData(form);
        const username = formData.get('username')?.trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        const role = formData.get('role');
        const department = formData.get('department')?.trim();
        const fullName = formData.get('full_name')?.trim();
        const email = formData.get('email')?.trim();

        if (!username || !password || !role || !fullName) {
            this.showError('All required fields must be filled');
            return;
        }
        if (role === 'admin' && !department) {
            this.showError('Department is required for admin users');
            return;
        }
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        try {
            const body = new URLSearchParams();
            body.append('username', username);
            body.append('password', password);
            body.append('role', role);
            body.append('full_name', fullName);
            if (email) body.append('email', email);
            if (role === 'admin' && department) body.append('department', department);

            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: body.toString()
            });

            const result = await response.json();
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
                form.reset();
                // Reset department visibility
                document.getElementById('add-department-group').style.display = 'none';
                this.loadUsers();
                this.showSuccess('User created successfully');
            } else this.showError(result.message || 'Failed to create user');
        } catch (error) {
            console.error('Error creating user:', error);
            this.showError('Network error while creating user');
        }
    }

    async updateUser() {
        const form = document.getElementById('edit-user-form');
        const data = Object.fromEntries(new FormData(form).entries());
        data.username = data.username?.trim();
        data.full_name = data.full_name?.trim();
        data.email = data.email?.trim();
        data.department = data.department?.trim();

        if (!data.user_id || !data.username || !data.role || !data.full_name) {
            this.showError('All required fields must be filled');
            return;
        }

        if (data.role === 'admin' && !data.department) {
            this.showError('Department is required for admin users');
            return;
        }

        if (data.password && data.password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        if (!data.password) delete data.password;
        if (data.role !== 'admin') delete data.department;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'PUT',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                this.loadUsers();
                this.showSuccess('User updated successfully');
            } else this.showError(result.message || 'Failed to update user');
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Network error while updating user');
        }
    }

    async editUser(userId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/users.php?id=${userId}`);
            if (!response) return;
            const result = await response.json();
            if (result.success) {
                this.currentUserId = userId;
                this.populateEditForm(result.data);
                new bootstrap.Modal(document.getElementById('editUserModal')).show();
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showError('Failed to load user details');
        }
    }

    populateEditForm(user) {
        const form = document.getElementById('edit-user-form');
        form.querySelector('[name="user_id"]').value = user.id;
        form.querySelector('[name="username"]').value = user.username;
        form.querySelector('[name="role"]').value = user.role;
        form.querySelector('[name="full_name"]').value = user.full_name;
        form.querySelector('[name="email"]').value = user.email || '';
        
        // Show/hide and populate department field based on role
        const departmentGroup = document.getElementById('edit-department-group');
        const departmentSelect = form.querySelector('[name="department"]');
        
        this.toggleDepartmentField(user.role, departmentGroup);
        
        if (user.role === 'admin') {
            departmentSelect.value = user.department || '';
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'PATCH',
                body: JSON.stringify({user_id: userId, action:'toggle_status'})
            });
            const result = await response.json();
            if (result.success) {
                this.loadUsers();
                this.showSuccess(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
            } else this.showError(result.message || 'Failed to update user status');
        } catch (error) {
            console.error('Error toggling status:', error);
            this.showError('Network error while updating user status');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/users.php?id=${userId}`, { method:'DELETE' });
            const result = await response.json();
            if (result.success) {
                this.loadUsers();
                this.showSuccess('User deleted successfully');
            } else this.showError(result.message || 'Failed to delete user');
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Network error while deleting user');
        }
    }

    // ------------------ Activity Logs ------------------
    async loadUserFilter() {
        try {
            const res = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php');
            const result = await res.json();
            const select = document.getElementById('userFilter');
            if (!result.success || !select) return;
            select.innerHTML = `<option value="">All Users</option>`;
            result.data.forEach(u => {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = u.full_name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading user filter:', error);
        }
    }

    async loadActivity(page = 1) {
        try {
            this.updateFilters();
            const { user_id, start_date, end_date } = this.currentFilters;
            const url = `../api/admin/activity_logs.php?page=${page}&user_id=${user_id}&start_date=${start_date}&end_date=${end_date}`;
            const response = await adminAuth.makeAuthenticatedRequest(url);
            const result = await response.json();
            if (!result.success) return;
            this.activityLogs = result.data;
            this.renderActivityTable(result.data);
            this.renderPagination(result.total_pages, result.current_page);
        } catch (error) {
            console.error('Error loading activity logs:', error);
        }
    }

    renderActivityTable(logs) {
        const tbody = document.getElementById('activity-tbody');
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">
                <i class="bi bi-inbox" style="font-size:2rem;"></i>
                <p class="mt-2">No activities found</p>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${log.full_name || '?'}</td>
                <td class="text-muted small">${log.description || '-'}</td>
                <td>
                    ${log.application_reference_no ? 
                        `<code class="small">${log.application_reference_no}</code>` : 
                        '<span class="text-muted">-</span>'}
                </td>
                <td class="text-muted small">${this.formatDateTime(log.created_at)}</td>
            </tr>
        `).join('');
    }

    renderPagination(totalPages, currentPage) {
        const container = document.getElementById('pagination');
        if (!container) return;
        container.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i> Previous</a>`;
        if (currentPage > 1) {
            prevLi.addEventListener('click', e => {
                e.preventDefault();
                this.loadActivity(currentPage - 1);
            });
        }
        container.appendChild(prevLi);

        // Current page (non-clickable)
        const currentLi = document.createElement('li');
        currentLi.className = 'page-item disabled';
        currentLi.innerHTML = `<span class="page-link">Page ${currentPage}</span>`;
        container.appendChild(currentLi);

        // Separator
        const separatorLi = document.createElement('li');
        separatorLi.className = 'page-item disabled';
        separatorLi.innerHTML = `<span class="page-link">-</span>`;
        container.appendChild(separatorLi);

        // Last page (non-clickable)
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item disabled';
        lastLi.innerHTML = `<span class="page-link">${totalPages}</span>`;
        container.appendChild(lastLi);

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#">Next <i class="bi bi-chevron-right"></i></a>`;
        if (currentPage < totalPages) {
            nextLi.addEventListener('click', e => {
                e.preventDefault();
                this.loadActivity(currentPage + 1);
            });
        }
        container.appendChild(nextLi);
    }

    async exportCSV() {
        try {
            // Show loading state
            const exportBtn = document.getElementById('exportCSV');
            const originalHTML = exportBtn.innerHTML;
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Exporting...';

            // Fetch ALL data with current filters (no pagination)
            const { user_id, start_date, end_date } = this.currentFilters;
            const url = `../api/admin/activity_logs.php?export=all&user_id=${user_id}&start_date=${start_date}&end_date=${end_date}`;
            const response = await adminAuth.makeAuthenticatedRequest(url);
            const result = await response.json();

            if (!result.success || !result.data || result.data.length === 0) {
                this.showError('No data to export');
                exportBtn.disabled = false;
                exportBtn.innerHTML = originalHTML;
                return;
            }

            const allLogs = result.data;

            // Create CSV
            const headers = ["User", "Description", "Application Ref", "Date"];
            const rows = allLogs.map(log => [
                this.escapeCsvValue(log.full_name || 'Unknown'),
                this.escapeCsvValue(log.description || '-'),
                this.escapeCsvValue(log.application_reference_no || '-'),
                this.escapeCsvValue(log.created_at || '-')
            ]);

            const csvContent = "data:text/csv;charset=utf-8," 
                + [headers, ...rows].map(r => r.join(",")).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.href = encodedUri;
            
            // Generate filename with today's date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            link.download = `activitylogs_${dateStr}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess(`Exported ${allLogs.length} records successfully`);
            
            // Restore button
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalHTML;

        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showError('Failed to export CSV');
            const exportBtn = document.getElementById('exportCSV');
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="bi bi-download me-1"></i>Export CSV';
        }
    }

    escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    // ------------------ Helpers ------------------
    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        return parts.map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
    }

    getActionBadgeClass(action) {
        const actionLower = (action || '').toLowerCase();
        if (actionLower.includes('login')) return 'bg-info';
        if (actionLower.includes('create') || actionLower.includes('add')) return 'bg-success';
        if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-warning text-dark';
        if (actionLower.includes('delete') || actionLower.includes('remove')) return 'bg-danger';
        if (actionLower.includes('approve')) return 'bg-primary';
        if (actionLower.includes('reject')) return 'bg-secondary';
        return 'bg-secondary';
    }

    getRoleBadgeClass(role) {
        const classes = { 'admin':'bg-danger', 'approver':'bg-warning', 'citymayor':'bg-primary' };
        return classes[role] || 'bg-secondary';
    }

    formatRole(role) {
        const names = { 'admin':'Administrator', 'approver':'Approver', 'citymayor':'City Mayor' };
        return names[role] || role;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
    }

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-PH', { 
            year:'numeric', 
            month:'short', 
            day:'numeric',
            hour:'2-digit',
            minute:'2-digit'
        });
    }

    showError(msg) { this.showAlert(msg, 'danger'); }
    showSuccess(msg) { this.showAlert(msg, 'success'); }

    showAlert(msg, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top:20px; right:20px; z-index:9999; min-width:300px;';
        alertDiv.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// ------------------ Initialize ------------------
let adminAccounts;
document.addEventListener('DOMContentLoaded', () => {
    adminAccounts = new AdminAccounts();
});