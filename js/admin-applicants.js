// Admin applicants management
class AdminApplicants {
    constructor() {
        this.currentApplicationId = null;
        this.filterTimeout = null; // For debouncing filter changes
        this.init();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.searchTimeout = null;
    }


    init() {
        this.loadApplicants();
        this.loadPrograms();
        this.setupEventListeners();
        this.startAutoRefresh();

    }
    
    
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadApplicants();
        }, 30000);
    }

    setupEventListeners() {
        // Dynamic filters - trigger on change
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
                    this.renderApplicantsTable();
                    this.renderPaginationControls();
                }, 300); // wait 300ms after typing stops
            });

            // Optional: press Enter to search instantly
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(this.searchTimeout);
                    this.searchQuery = e.target.value.trim().toLowerCase();
                    this.currentPage = 1;
                    this.renderApplicantsTable();
                    this.renderPaginationControls();
                }
            });
        }

        // Optional: click search icon to manually trigger filter
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput.value.trim().toLowerCase();
                this.currentPage = 1;
                this.renderApplicantsTable();
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
            this.loadApplicants();
        }, 300); // Wait 300ms after last change
    }

    async loadPrograms() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/programs.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderProgramFilter(result.data);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    renderProgramFilter(programs) {
        const filter = document.getElementById('program-filter');
        if (!filter) return;

        const options = programs.map(program => 
            `<option value="${program.id}">${program.name}</option>`
        ).join('');

        filter.innerHTML = '<option value="">All Programs</option>' + options;
    }

    async loadApplicants() {
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/applicants.php?${queryString}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                // Store full data for pagination
                this.allApplicants = result.data;
                this.renderApplicantsTable(); // ✅ Updated: no argument
                this.renderPaginationControls(); // ✅ Added
            }
        } catch (error) {
            console.error('Error loading applicants:', error);
            this.showError('Failed to load applicants data');
        }
    }


    getFilters() {
        return {
            program: document.getElementById('program-filter')?.value || '',
            date: document.getElementById('date-filter')?.value || ''
        };
    }

    renderApplicantsTable() {
        const tbody = document.getElementById('applicants-tbody');
        if (!tbody) return;

        let applicants = this.allApplicants || [];

        // ✅ Apply search filter
        if (this.searchQuery) {
            applicants = applicants.filter(a =>
                a.reference_no.toLowerCase().includes(this.searchQuery) ||
                a.client_full_name.toLowerCase().includes(this.searchQuery)
            );
        }

        if (applicants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No applicants found</p>
                    </td>
                </tr>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedApplicants = applicants.slice(startIndex, startIndex + this.itemsPerPage);

        tbody.innerHTML = paginatedApplicants.map(applicant => {
            // ✅ Check if recently released within 3 months
            const isRecentlyReleased = applicant.recently_released == 1;
            const rowClass = isRecentlyReleased ? 'table-danger' : '';
            const tooltipAttr = isRecentlyReleased 
                ? `data-bs-toggle="tooltip" data-bs-placement="top" title="⚠️ Applied within 3 months of a previously released application."`
                : '';

            return `
                <tr class="${rowClass}"${tooltipAttr}>
                    <td>${this.formatDate(applicant.created_at)}</td>
                    <td>
                        <span class="fw-bold ${isRecentlyReleased ? 'text-danger' : 'text-primary'}">
                            ${applicant.reference_no}
                        </span>
                    </td>
                    <td class="${isRecentlyReleased ? 'text-danger' : ''}">
                        ${applicant.client_full_name}
                    </td>
                    <td><span class="badge bg-light text-dark">${applicant.service_name}</span></td>
                    <td>${applicant.email}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="adminApplicants.viewApplication('${applicant.id}')" title="View Application">
                                <i class="bi bi-file-text me-1"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger ms-1" onclick="adminApplicants.updateApplicationStatus('rejected', '${applicant.id}')" title="Reject Application">
                                <i class="bi bi-x-circle me-1"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success ms-1" onclick="adminApplicants.updateApplicationStatus('approved', '${applicant.id}')" title="Approve Application">
                                <i class="bi bi-arrow-right-circle me-1"></i> 
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');   
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el)); 
    }


    renderPaginationControls() {
        let applicants = this.allApplicants || [];

        // ✅ Apply search filter again for correct pagination
        if (this.searchQuery) {
            applicants = applicants.filter(a =>
                a.reference_no.toLowerCase().includes(this.searchQuery) ||
                a.client_full_name.toLowerCase().includes(this.searchQuery)
            );
        }

        const totalItems = applicants.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const pageNumbers = document.getElementById('page-numbers');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        pageNumbers.innerText = `Page ${this.currentPage} of ${totalPages || 1}`;
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderApplicantsTable();
                this.renderPaginationControls();
            }
        };

        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderApplicantsTable();
                this.renderPaginationControls();
            }
        };
    }



    async viewApplication(applicationId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/application-details.php?id=${applicationId}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.currentApplicationId = applicationId;
                this.renderApplicationDetails(result.data);
                const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading application details:', error);
            this.showError('Failed to load application details');
        }
    }

    renderApplicationDetails(application) {
        const container = document.getElementById('application-details');
        if (!container) return;

        container.innerHTML = `
            <div class="application-form-view">
                <!-- I. Client's Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">I. Client's Identifying Information</h6>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group col-11">
                                <label>1. Client's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" value="${application.client_last_name}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.client_first_name}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.client_middle_name}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.client_extension}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.client_sex === 'Male' ? 'checked' : ''} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.client_sex === 'Female' ? 'checked' : ''} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" value="${application.client_address}" readonly>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>5. Place of Birth</label>
                                <input type="text" value="${application.client_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>6. Relationship to Beneficiary</label>
                                <input type="text" value="${application.relationship_to_beneficiary || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>7. Civil Status</label>
                                <input type="text" value="${application.civil_status || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>8. Religion</label>
                                <input type="text" value="${application.religion || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>9. Nationality</label>
                                <input type="text" value="${application.nationality || 'Filipino'}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>10. Highest Educational Attainment</label>
                                <input type="text" value="${application.education || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>11. Skills/Occupation*</label>
                                <input type="text" value="${application.occupation || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>12. Estimated Monthly Income</label>
                                <div class="income-field">
                                    <span>₱</span>
                                    <input type="text" value="${application.monthly_income || ''}" readonly>

                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-3">
                                <label>13. PhilHealth No.</label>
                                <input type="text" value="${application.philhealth_no || ''}" readonly>
                            </div>
                            <div class="form-group col-2">
                                <label>14. Mode of Admission*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.admission_mode === 'Online' ? 'checked' : ''} disabled> Online
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.admission_mode === 'Referral' ? 'checked' : ''} disabled> Referral
                                    </label>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>15. Referring party</label>
                                <input type="text" value="${application.referring_party || ''}" readonly>
                            </div>
                            <div class="form-group col-3">
                                <label class="mt-1">16. Contact #</label>
                                <input type="text" value="${application.contact_number || ''}" readonly>
                            </div>

                        </div>
                    </div>
                </div>
                
                <!-- II. Beneficiary Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">II. Beneficiary Identifying Information</h6>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group col-12">
                                <div class="category-checkboxes">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Informal Settler Family' ? 'checked' : ''} disabled> Informal Settler Family
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Disadvantaged Individual' ? 'checked' : ''} disabled> Disadvantaged Individual
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Indigenous People' ? 'checked' : ''} disabled> Indigenous People
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Pantawid Beneficiary' ? 'checked' : ''} disabled> Pantawid Beneficiary
                                    </label>
                                    ${application.category === 'Pantawid Beneficiary' ? `
                                        <div class="id-field">
                                            <span>ID No.</span>
                                            <input type="text" value="${application.category_id_no || ''}" readonly>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-11">
                                <label>1. Beneficiary's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" value="${application.beneficiary_last_name}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.beneficiary_first_name}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.beneficiary_middle_name}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${application.beneficiary_extension}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_sex === 'Male' ? 'checked' : ''} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_sex === 'Female' ? 'checked' : ''} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" value="${application.beneficiary_address || ''}" readonly>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-8">
                                <label>5. Place of Birth</label>
                                <input type="text" value="${application.beneficiary_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>6. Civil Status</label>
                                <input type="text" value="${application.beneficiary_civil_status || ''}" readonly>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- III. Beneficiary's Family Composition -->
                <div class="form-section">
                    <h6 class="section-title">III. Beneficiary's Family Composition</h6>
                    <div class="family-table-container">
                        <table class="family-table">
                            <thead>
                                <tr>
                                    <th rowspan="2">Full Name</th>
                                    <th rowspan="2">Sex</th>
                                    <th rowspan="2">Birthdate<br><small>yyyy/mm/dd</small></th>
                                    <th rowspan="2">Civil Status</th>
                                    <th rowspan="2">Relationship</th>
                                    <th rowspan="2">Highest Educational Attainment</th>
                                    <th rowspan="2">Skills / Occupation</th>
                                    <th rowspan="2">Est. Monthly Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderFamilyRows(application.family_members)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Submitted Documents -->
                <div class="form-section">
                    <h6 class="section-title">Submitted Documents</h6>
                    <div id="submitted-documents">
                        ${application.documents && application.documents.length > 0 
                            ? `<div class="row g-3">
                                ${application.documents.map(doc => `
                                    <div class="col-md-6">
                                        <div class="document-item border rounded p-3">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 class="mb-1">${doc.file_name}</h6>
                                                    <small class="text-muted">
                                                        <i class="bi bi-calendar me-1"></i>
                                                        ${this.formatDate(doc.uploaded_at)}
                                                    </small>
                                                </div>
                                                <div class="btn-group">
                                                <button 
                                                    class="btn btn-sm btn-outline-primary view-document-btn" 
                                                    data-file-path="../${doc.file_path}" 
                                                    data-file-name="${doc.file_name}">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <a href="../${doc.file_path}" download class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-download"></i>
                                                </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                            : `<div class="text-center text-muted py-4">
                                <i class="bi bi-files" style="font-size: 2rem;"></i>
                                <p class="mt-2">No documents uploaded</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    

    renderFamilyRows(familyMembers) {
        if (!familyMembers || familyMembers.length === 0) {
            return `
                <tr>
                    <td colspan="8" class="text-center text-muted py-3">No family members listed</td>
                </tr>
            `;
        }
        
        // Create 5 rows minimum
        const rows = [];
        for (let i = 0; i < Math.max(5, familyMembers.length); i++) {
            const member = familyMembers[i] || {};
            rows.push(`
                <tr>
                    <td><input type="text" value="${member.full_name || ''}" readonly></td>
                    <td><input type="text" value="${member.sex || ''}" readonly></td>
                    <td><input type="text" value="${member.birthdate ? this.formatDateForForm(member.birthdate, 'full') : ''}" readonly></td>
                    <td><input type="text" value="${member.civil_status || ''}" readonly></td>
                    <td><input type="text" value="${member.relationship || ''}" readonly></td>
                    <td><input type="text" value="${member.education || ''}" readonly></td>
                    <td><input type="text" value="${member.occupation || ''}" readonly></td>
                    <td><input type="text" value="${member.monthly_income || ''}" readonly></td>
                </tr>
            `);
        }
        return rows.join('');
    }
    formatDateForForm(dateString, part) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (part === 'year') return date.getFullYear().toString();
        if (part === 'month') return (date.getMonth() + 1).toString().padStart(2, '0');
        if (part === 'day') return date.getDate().toString().padStart(2, '0');
        if (part === 'full') return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        return '';
    }

    updateApplicationStatus(status, applicationId = null) {
        this.currentApplicationId = applicationId || this.currentApplicationId;
        if (!this.currentApplicationId) return;

        // ✅ APPROVE FLOW (keep confirmation + scheduling)
        if (status === "approved") {
            const confirmationMsg = "Are you sure you want to approve this application and schedule an interview?";
            document.getElementById("confirmation-message").innerText = confirmationMsg;

            // Show scheduling inputs
            const scheduleFields = document.getElementById("schedule-fields");
            scheduleFields.style.display = "block";

            // Set default date and time to current
            const now = new Date();
            const today = now.toISOString().split("T")[0];
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

            const dateInput = document.getElementById("interview-date");
            const timeInput = document.getElementById("interview-time");

            dateInput.value = today;
            dateInput.min = today; // Prevent selecting past dates

            timeInput.value = currentTime;

            // Add event listener to prevent past times for today
            dateInput.addEventListener("change", function() {
                const selectedDate = this.value;
                const now = new Date();
                const today = now.toISOString().split("T")[0];
                
                if (selectedDate === today) {
                    // If today is selected, set min time to current time
                    const currentTime = now.toTimeString().slice(0, 5);
                    timeInput.min = currentTime;
                    
                    // If current time value is less than min, update it
                    if (timeInput.value < currentTime) {
                        timeInput.value = currentTime;
                    }
                } else {
                    // If future date, remove time restriction
                    timeInput.removeAttribute("min");
                }
            });

            // Set initial min time for current date
            timeInput.min = currentTime;

            const modal = new bootstrap.Modal(document.getElementById("confirmationModal"));
            modal.show();

            // Reset previous listeners
            const confirmBtn = document.getElementById("confirm-action-btn");
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            const newConfirmBtn = document.getElementById("confirm-action-btn");

            newConfirmBtn.addEventListener("click", async () => {
                const date = document.getElementById("interview-date").value;
                const time = document.getElementById("interview-time").value;

                // Validate input
                if (!date || !time) {
                    this.showError("Please set both date and time for the interview.");
                    return;
                }

                if (time < "08:00" || time > "17:00") {
                    this.showError("Interview time must be between 8:00 AM and 5:00 PM.");
                    return;
                }

                // Additional validation: check if selected datetime is in the past
                const selectedDateTime = new Date(`${date}T${time}`);
                const now = new Date();
                
                if (selectedDateTime < now) {
                    this.showError("Cannot schedule interview in the past. Please select a future date and time.");
                    return;
                }

                // ✅ Check schedule availability
                const checkResponse = await adminAuth.makeAuthenticatedRequest(
                    "../api/admin/check_schedule.php",
                    {
                        method: "POST",
                        body: JSON.stringify({ date: date, time: time }),
                    }
                );

                const checkResult = await checkResponse.json();

                if (!checkResult.success) {
                    this.showError(checkResult.message);
                    return;
                }

                modal.hide();

                try {
                    const response = await adminAuth.makeAuthenticatedRequest(
                        "../api/admin/update-status.php",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                application_id: this.currentApplicationId,
                                status: "approved",
                                schedule_date: date,
                                schedule_time: time,
                                action: "forward_to_interview",
                            }),
                        }
                    );

                    const result = await response.json();

                    if (result.success) {
                        this.loadApplicants();
                        this.showSuccess("Application approved and interview scheduled successfully.");
                    } else {
                        this.showError(result.message || "Failed to update application status");
                    }
                } catch (error) {
                    console.error("Error updating status:", error);
                    this.showError("Network error while updating status");
                }
            });

            return; // ✅ Exit here so reject flow below doesn't trigger
        }

        // 🚫 REJECT FLOW — skip confirmation modal, go directly to rejection reason
        const rejectModal = new bootstrap.Modal(document.getElementById("rejectionReasonModal"));
        document.getElementById("rejection-reason").value = ""; // Clear textarea
        rejectModal.show();

        // Reset previous listeners
        const confirmRejectBtn = document.getElementById("confirm-reject-btn");
        confirmRejectBtn.replaceWith(confirmRejectBtn.cloneNode(true));
        const newConfirmRejectBtn = document.getElementById("confirm-reject-btn");

        newConfirmRejectBtn.addEventListener("click", async () => {
            const reason = document.getElementById("rejection-reason").value.trim();
            if (!reason) {
                this.showError("Please enter a reason for rejection.");
                return;
            }

            rejectModal.hide();

            try {
                const response = await adminAuth.makeAuthenticatedRequest(
                    "../api/admin/update-status.php",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            application_id: this.currentApplicationId,
                            status: "rejected",
                            action: "reject",
                            reason: reason,
                        }),
                    }
                );

                const result = await response.json();

                if (result.success) {
                    this.showSuccess("Application rejected and email notification sent.");
                    this.loadApplicants();
                } else {
                    this.showError(result.message || "Failed to reject application.");
                }
            } catch (error) {
                console.error("Error rejecting application:", error);
                this.showError("Network error while rejecting application.");
            }
        });
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
            'Pending for approval': 'pending',
            'Approved': 'approved',
            'Rejected': 'rejected',
            'Waiting for approval of heads/city mayor': 'waiting',
            'Ready for release': 'ready'
        };
        return statusMap[status] || 'pending';
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
let adminApplicants;
// Attach event listener for document view buttons
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
    adminApplicants = new AdminApplicants();
});