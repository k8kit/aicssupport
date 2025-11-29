// Approver beneficiaries management
class ApproverBeneficiaries {
    constructor() {
        this.init();
        this.currentPage = 1
        this.itemsPerPage = 10
        this.searchQuery = ''
        this.searchTimeout = null
        this.filterTimeout = null
        this.allBeneficiaries = []
    }

    init() {
        this.loadBeneficiaries();
        this.adminAuth = window.adminAuth
        this.bootstrap = window.bootstrap
        this.loadPrograms()
        this.setupEventListeners()
        this.startAutoRefresh()
        this.setupSearchListeners()
    }
    startAutoRefresh() {
    // Auto-refresh every 30 seconds
        setInterval(() => {
        this.loadBeneficiaries()

        }, 30000)
    }

    setupEventListeners() {
        // Remove optional chaining - these elements MUST exist
        document.getElementById('program-filter').addEventListener('change', () => {
            this.applyFiltersWithDebounce()
        })

        document.getElementById('date-filter').addEventListener('change', () => {
            this.applyFiltersWithDebounce()
        })
    }
    setupSearchListeners() {

        // Search
        const searchInput = document.getElementById('search-input')
        const searchBtn = document.getElementById('search-btn')

        if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout)
            this.searchTimeout = setTimeout(() => {
            this.searchQuery = e.target.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
            }, 300)
        })

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
            clearTimeout(this.searchTimeout)
            this.searchQuery = e.target.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
            }
        })
        }

        if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            this.searchQuery = searchInput.value.trim().toLowerCase()
            this.currentPage = 1
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        })
        }
    }

    applyFiltersWithDebounce() {
        if (this.filterTimeout) {
        clearTimeout(this.filterTimeout)
        }
        this.filterTimeout = setTimeout(() => {
        this.loadBeneficiaries()
        }, 300)
    }
    async loadPrograms() {
        try {
        const response = await window.adminAuth.makeAuthenticatedRequest("../api/programs.php")
        if (!response) return

        const result = await response.json()
        if (result.success) {
            this.renderProgramFilter(result.data)
        }
        } catch (error) {
        console.error("Error loading programs:", error)
        }
    }
    renderProgramFilter(programs) {
        const filter = document.getElementById("program-filter")
        if (!filter) return

        const options = programs.map((program) => `<option value="${program.id}">${program.name}</option>`).join("")

        filter.innerHTML = '<option value="">All Programs</option>' + options
    }
  
    async loadBeneficiaries() {
        try {
            const filters = this.getFilters()
            const queryString = new URLSearchParams(filters).toString()
            const response = await adminAuth.makeAuthenticatedRequest(`../api/approver/beneficiaries.php?${queryString}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.allBeneficiaries = result.data;
                console.log('Stored beneficiaries:', this.allBeneficiaries);
                this.renderBeneficiariesTable();
                this.renderPaginationControls()
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
            this.showError('Failed to load beneficiaries data');
        }
    }

    getFilters() {
        return {
        program: document.getElementById("program-filter")?.value || "",
        date: document.getElementById("date-filter")?.value || "",
        }
    }


    renderBeneficiariesTable() {
        const tbody = document.getElementById('beneficiaries-tbody');
        if (!tbody) return;

        let beneficiaries = this.allBeneficiaries || [];

        if (this.searchQuery) {
            beneficiaries = beneficiaries.filter(b =>
                b.reference_no.toLowerCase().includes(this.searchQuery) ||
                b.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
            );
        }

        if (beneficiaries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No approved beneficiaries found</p>
                    </td>
                </tr>
            `;
            return;
        }
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = beneficiaries.slice(startIndex, startIndex + this.itemsPerPage);

        tbody.innerHTML = paginated.map(beneficiary => `
            <tr>
                <td>${this.formatDate(beneficiary.updated_at)}</td>
                <td>
                    <span class="fw-bold text-primary">${beneficiary.reference_no}</span>
                </td>
                <td>${beneficiary.beneficiary_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${beneficiary.service_name}</span>
                </td>
                <td>${beneficiary.email}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                        onclick="approverBeneficiaries.viewApplication('${beneficiary.id}')"
                        title="View Application">
                        <i class="bi bi-file-text me-1"></i>
                        </button>
                    </div>
                </td>

            </tr>
        `).join('');
    }

    renderPaginationControls() {
        const totalItems = (this.allBeneficiaries || []).filter(a =>
        !this.searchQuery ||
        a.reference_no.toLowerCase().includes(this.searchQuery) ||
        a.beneficiary_full_name.toLowerCase().includes(this.searchQuery)
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
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        }
        }

        nextBtn.onclick = () => {
        if (this.currentPage < totalPages) {
            this.currentPage++
            this.renderBeneficiariesTable()
            this.renderPaginationControls()
        }
        }
    }
    async viewApplication(applicationId) {
        try {
        const response = await this.adminAuth.makeAuthenticatedRequest(
            `../api/admin/application-details.php?id=${applicationId}`,
        )
        if (!response) return

        const result = await response.json()

        if (result.success) {
            this.currentApplicationId = applicationId
            this.renderApplicationDetails(result.data)
            const modal = new this.bootstrap.Modal(document.getElementById("applicationModal"))
            modal.show()
        }
        } catch (error) {
        console.error("Error loading application details:", error)
        this.showError("Failed to load application details")
        }
    }

  renderApplicationDetails(application) {
    const container = document.getElementById("application-details")
    if (!container) return

    container.innerHTML = `
            <div class="application-form-view">
                <!-- I. Client's Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">I. Client's Identifying Information</h6>
                    <div class="form-grid">
                        ${this.renderClientIdentifyingSection(application)}
                    </div>
                </div>
                
                <!-- II. Beneficiary Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">II. Beneficiary Identifying Information</h6>
                    <div class="form-grid">
                        ${this.renderBeneficiaryIdentifyingSection(application)}
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
                
                <!-- IV. Assessment -->
                <div class="form-section">
                    <h6 class="section-title">IV. Assessment</h6>
                    <table class="form-table">
                        <tr>
                            <td style="width: 33%; vertical-align: top; padding: 10px;">
                                <strong>1. Problem/s Presented</strong>
                                <textarea rows="12" name="problems_presented" readonly style="width: 100%; margin-top: 5px;">${application.problems_presented || ""}</textarea>
                            </td>
                            <td style="width: 33%; vertical-align: top; padding: 10px; border-left: 3px solid #000;">
                                <strong>2. Social Worker's Assessment</strong>
                                <textarea rows="12" name="social_worker_assessment" readonly style="width: 100%; margin-top: 5px;">${application.social_worker_assessment || ""}</textarea>
                            </td>
                            <td style="width: 34%; vertical-align: top; padding: 10px; border-left: 3px solid #000;">
                                <strong>3. Client Category <small>(check only one)</small></strong>
                                <div class="checkbox-group-vertical" style="margin-top: 5px;">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Children in Need of Special Protection" ${application.client_category === "Children in Need of Special Protection" ? "checked" : ""} disabled> Children in Need of Special Protection
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Youth in Need of Special Protection" ${application.client_category === "Youth in Need of Special Protection" ? "checked" : ""} disabled> Youth in Need of Special Protection
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Women in Especially Difficult Circumstances" ${application.client_category === "Women in Especially Difficult Circumstances" ? "checked" : ""} disabled> Women in Especially Difficult Circumstances
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Person with Disability" ${application.client_category === "Person with Disability" ? "checked" : ""} disabled> Person with Disability
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Senior Citizen" ${application.client_category === "Senior Citizen" ? "checked" : ""} disabled> Senior Citizen
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_category" value="Family Head and Other Needy Adult" ${application.client_category === "Family Head and Other Needy Adult" ? "checked" : ""} disabled> Family Head and Other Needy Adult
                                    </label>
                                </div>
                                <div style="margin-top: 10px;">
                                    <strong>4. Client Sub-Category</strong>
                                    <input type="text" name="client_subcategory" value="${application.client_subcategory || ""}" readonly style="width: 100%; margin-top: 5px;">
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- V. Recommended Services and Assistance - Matching the image layout exactly -->
                <div class="form-section">
                  <h6 class="section-title">V. Recommended Services and Assistance</h6>

                  <div class="form-grid">
                    <!-- 1. Nature of Service / Assistance -->
                    <div class="form-row">
                      <div class="form-group col-12">
                        <label>1. Nature of Service / Assistance</label>
                        <div class="checkbox-group-inline" style="display: flex; flex-wrap: wrap; gap: 50px; align-items: center;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Counseling"
                              ${application.service_type_nature === "Counseling" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Counseling
                          </label>
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Legal Assistance"
                              ${application.service_type_nature === "Legal Assistance" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Legal Assistance
                          </label>
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Referral"
                              ${application.service_type_nature === "Referral" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Referral
                          </label>
                          <!-- Referral Specify Input (next to Referral checkbox) -->
                          <input
                            type="text"
                            name="service_nature_referral_specify"
                            value="${application.service_nature_referral_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.service_type_nature === 'Referral' ? '' : 'd-none'}"
                            placeholder="Please specify referral details..."
                            style="width: 250px; margin: 0;"
                          >
                          
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                            <input
                              type="checkbox"
                              name="service_type_nature"
                              value="Others"
                              ${application.service_type_nature === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 5px;"
                            >
                            Others
                          </label>
                          <!-- Others Specify Input (next to Others checkbox) -->
                          <input
                            type="text"
                            name="service_nature_others_specify"
                            value="${application.service_nature_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.service_type_nature === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify other service..."
                            style="width: 250px; margin: 0;"
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Financial & Material Assistance -->
                    <div class="form-row mt-3">
                      <div class="form-group col-6">
                      <!-- Financial Assistance -->
                      <label class="fw-bold">Financial Assistance</label>
                      <div class="checkbox-group-vertical mt-2">
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Medical"
                            ${application.financial_type === "Medical" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Medical
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Burial"
                            ${application.financial_type === "Burial" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Burial
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Transportation"
                            ${application.financial_type === "Transportation" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Transportation
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Educational"
                            ${application.financial_type === "Educational" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Educational
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="financial_type"
                            value="Food Subsidy"
                            ${application.financial_type === "Food Subsidy" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Food Subsidy
                        </label>
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 8px;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                            <input
                              type="checkbox"
                              name="financial_type"
                              value="Others"
                              ${application.financial_type === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Others
                          </label>
                          <input
                            type="text"
                            name="financial_others_specify"
                            value="${application.financial_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.financial_type === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify..."
                            style="flex: 1; margin: 0; min-width: 200px; max-width: 400px;"
                          >
                        </div>
                      </div>

                      <div class="mt-2">
                        <label>Sub-total:</label>
                        <input
                          type="text"
                          name="assistance_subtotal"
                          value="${application.assistance_subtotal || ''}"
                          readonly
                        >
                      </div>

                      <!-- Material Assistance -->
                      <label class="fw-bold mt-3">Material Assistance</label>
                      <div class="checkbox-group-vertical mt-2">
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Food Pack"
                            ${application.material_assistance === "Food Pack" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Food Pack
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Used Clothing"
                            ${application.material_assistance === "Used Clothing" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Used Clothing
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Hot Meal"
                            ${application.material_assistance === "Hot Meal" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Hot Meal
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <input
                            type="checkbox"
                            name="material_assistance"
                            value="Assistive Device"
                            ${application.material_assistance === "Assistive Device" ? "checked" : ""}
                            disabled
                            style="margin-right: 8px;"
                          >
                          Assistive Device
                        </label>
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 8px;">
                          <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                            <input
                              type="checkbox"
                              name="material_assistance"
                              value="Others"
                              ${application.material_assistance === "Others" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Others
                          </label>
                          <input
                            type="text"
                            name="material_others_specify"
                            value="${application.material_others_specify || ''}"
                            readonly
                            class="form-control form-control-sm ${application.material_assistance === 'Others' ? '' : 'd-none'}"
                            placeholder="Please specify..."
                            style="flex: 1; margin: 0; min-width: 200px; max-width: 400px;"
                          >
                        </div>
                      </div>
                    </div>

                      <!-- Value, Mode, and Source -->
                      <div class="form-group col-">
                        <label>Value (₱) / Amount of Financial Assistance to be Extended:</label>
                        <div class="income-field">
                          <span>₱</span>
                          <input
                            type="text"
                            name="assistance_amount"
                            value="${application.assistance_amount || ''}"
                            readonly
                          >
                        </div>

                        <!-- Mode of Assistance -->
                        <label class="mt-2">Mode of Financial Assistance</label>
                        <div class="checkbox-group-vertical mt-2">
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Cash"
                              ${application.assistance_mode === "Cash" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Cash
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Check"
                              ${application.assistance_mode === "Check" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Check
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Guarantee Letter"
                              ${application.assistance_mode === "Guarantee Letter" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Guarantee Letter
                          </label>
                          <label class="checkbox-label" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input
                              type="checkbox"
                              name="assistance_mode"
                              value="Tickets"
                              ${application.assistance_mode === "Tickets" ? "checked" : ""}
                              disabled
                              style="margin-right: 8px;"
                            >
                            Tickets
                          </label>

                          <!-- Transport Modes -->
                          <div class="checkbox-group-inline mt-2" style="display: flex; flex-wrap: wrap; gap: 25px; align-items: center; margin-left: 20px;">
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Bus"
                                ${application.transport_mode === "Bus" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Bus
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Boat"
                                ${application.transport_mode === "Boat" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Boat
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="transport_mode"
                                value="Plane"
                                ${application.transport_mode === "Plane" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Plane
                            </label>
                          </div>
                        </div>

                        <!-- Source of Assistance -->
                        <div class="mt-4">
                          <label class="fw-bold">Source of Assistance</label>
                          <div class="checkbox-group-inline mt-2" style="display: flex; flex-wrap: wrap; gap: 25px; align-items: center;">
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="Regular Funds"
                                ${application.assistance_source === "Regular Funds" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Regular Funds
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="Donation"
                                ${application.assistance_source === "Donation" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              Donation
                            </label>
                            <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0;">
                              <input
                                type="checkbox"
                                name="assistance_source"
                                value="AICS"
                                ${application.assistance_source === "AICS" ? "checked" : ""}
                                disabled
                                style="margin-right: 8px;"
                              >
                              AICS
                            </label>
                            
                            <!-- Others with text box group -->
                            <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 300px;">
                              <label class="checkbox-label" style="display: inline-flex; align-items: center; margin: 0; white-space: nowrap;">
                                <input
                                  type="checkbox"
                                  name="assistance_source"
                                  value="Others"
                                  ${application.assistance_source === "Others" ? "checked" : ""}
                                  disabled
                                  style="margin-right: 8px;"
                                >
                                Others
                              </label>
                              <input
                                type="text"
                                name="assistance_source_others_specify"
                                value="${application.assistance_source_others_specify || ''}"
                                readonly
                                class="form-control form-control-sm ${application.assistance_source === 'Others' ? '' : 'd-none'}"
                                placeholder="Please specify source..."
                                style="flex: 1; margin: 0; min-width: 200px;"
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                <div class="form-section mt-6">
                    <div class="form-grid">
                        <div class="form-row" style="border-bottom: none;">
                            <div class="form-group col-6">
                                <div class="signature-section">
                                    <div class="signature-box">
                                        ${
                                          application.signature_path
                                            ? `<img src="../${application.signature_path}" class="signature-image" alt="Client Signature">`
                                            : '<div class="signature-placeholder">No signature available</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            <small style="font-size: 10px; font-weight: bold;">Client's Signature</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="signature-section">
                                    <label style="font-size: 11px; font-weight: bold; margin-bottom: 0.5rem; display: block;">Interviewed by:</label>
                                    <div class="signature-box">
                                        ${
                                          application.staff_signature_path
                                            ? `<img src="../${application.staff_signature_path}" class="signature-image" alt="Social Worker Signature">`
                                            : '<div class="signature-placeholder">Signed by Social Worker</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            ${
                                              application.staff_full_name
                                                ? `<small style="font-size: 9px; display: block; font-weight: bold;">${application.staff_full_name}</small>`
                                                : ''
                                            }
                                            <small style="font-size: 9px; display: block;">Name/Signature of Social Worker</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">License Number: ${application.staff_license_number || '_______________'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group col-6">
                                <div class="signature-section">
                                    <label style="font-size: 11px; font-weight: bold; margin-bottom: 0.5rem; display: block;">Reviewed and Recommending Approval by:</label>
                                    <div class="signature-box" id="approver-signature-box">
                                        ${
                                          application.approver_signature_path
                                            ? `<img src="../${application.approver_signature_path}" class="signature-image" alt="Approver Signature">`
                                            : '<div class="signature-placeholder">Signed by Approver</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
                                            <small id="approver-name-display" style="font-size: 9px; display: block; font-weight: bold;">${application.approver_name || 'No Name'}</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">Name/Signature of CSWDO Head</small>
                                        </div>
                                    </div>
                                    
                                    <label style="font-size: 11px; font-weight: bold; margin: 1rem 0 0.5rem 0; display: block;">Approved by:</label>
                                    <div class="signature-box">
                                        ${
                                          application.mayor_signature_path
                                            ? `<img src="../${application.mayor_signature_path}" class="signature-image" alt="Mayor Signature">`
                                            : '<div class="signature-placeholder">Pending Final Approval</div>'
                                        }
                                    </div>
                                    <div class="signature-info-static">
                                        <div class="text-center border-top pt-2 mt-2">
+                                           <small id="mayor-name-display" style="font-size: 9px; display: block; font-weight: bold;">${application.mayor_name || 'No Name'}</small>
                                            <small style="font-size: 9px; display: block; margin-top: 0.25rem;">City Mayor/Public Servant</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                     
                        <div class="form-row mt-3">
                            <div class="form-group col-6">
                                <label style="font-size: 11px; font-weight: bold;">2. Name of Payee</label>
                                <input type="text" value="${application.payee_name || ""}" readonly style="width: 100%; border: 1px solid #000; padding: 0.25rem; font-size: 11px;">
                            </div>
                            <div class="form-group col-6">
                                <label style="font-size: 11px; font-weight: bold;">3. Address of Payee</label>
                                <input type="text" value="${application.payee_address || ""}" readonly style="width: 100%; border: 1px solid #000; padding: 0.25rem; font-size: 11px;">
                            </div>
                        </div>
                    </div>
                </div>

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
        `
        const financialOthersCheckbox = document.querySelector('input[name="financial_type"][value="Others"]');
        const financialSpecifyInput = document.querySelector('input[name="financial_others_specify"]');
        if (financialOthersCheckbox && financialSpecifyInput) {
          financialOthersCheckbox.addEventListener('change', () => {
            if (financialOthersCheckbox.checked) {
              financialSpecifyInput.classList.remove('d-none');
              financialSpecifyInput.removeAttribute('readonly');
            } else {
              financialSpecifyInput.classList.add('d-none');
              financialSpecifyInput.value = '';
            }
          });
        }
        const assistanceSourceOthersCheckbox = document.querySelector('input[name="assistance_source"][value="Others"]');
        const assistanceSourceSpecifyInput = document.querySelector('input[name="assistance_source_others_specify"]');
        if (assistanceSourceOthersCheckbox && assistanceSourceSpecifyInput) {
          assistanceSourceOthersCheckbox.addEventListener('change', () => {
            if (assistanceSourceOthersCheckbox.checked) {
              assistanceSourceSpecifyInput.classList.remove('d-none');
              assistanceSourceSpecifyInput.removeAttribute('readonly');
            } else {
              assistanceSourceSpecifyInput.classList.add('d-none');
              assistanceSourceSpecifyInput.value = '';
            }
          });
        }
        const referralCheckbox = document.querySelector('input[name="service_type_nature"][value="Referral"]');
        const referralSpecifyInput = document.querySelector('input[name="service_nature_referral_specify"]');
        if (referralCheckbox && referralSpecifyInput) {
          referralCheckbox.addEventListener('change', () => {
            if (referralCheckbox.checked) {
              referralSpecifyInput.classList.remove('d-none');
              referralSpecifyInput.removeAttribute('readonly');
            } else {
              referralSpecifyInput.classList.add('d-none');
              referralSpecifyInput.value = '';
            }
          });
        }

        // 🔄 Show/hide 'Others Specify' input dynamically for service type nature
        const serviceOthersCheckbox = document.querySelector('input[name="service_type_nature"][value="Others"]');
        const serviceOthersSpecifyInput = document.querySelector('input[name="service_nature_others_specify"]');
        if (serviceOthersCheckbox && serviceOthersSpecifyInput) {
          serviceOthersCheckbox.addEventListener('change', () => {
            if (serviceOthersCheckbox.checked) {
              serviceOthersSpecifyInput.classList.remove('d-none');
              serviceOthersSpecifyInput.removeAttribute('readonly');
            } else {
              serviceOthersSpecifyInput.classList.add('d-none');
              serviceOthersSpecifyInput.value = '';
            }
          });
        }

        const materialOthersCheckbox = document.querySelector('input[name="material_assistance"][value="Others"]');
        const materialSpecifyInput = document.querySelector('input[name="material_others_specify"]');
        if (materialOthersCheckbox && materialSpecifyInput) {
          materialOthersCheckbox.addEventListener('change', () => {
            if (materialOthersCheckbox.checked) {
              materialSpecifyInput.classList.remove('d-none');
              materialSpecifyInput.removeAttribute('readonly');
            } else {
              materialSpecifyInput.classList.add('d-none');
              materialSpecifyInput.value = '';
            }
          });
        }

  }
  renderClientIdentifyingSection(application) {
    return `
                        <div class="form-row">
                            <div class="form-group col-11">
                                <label>1. Client's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" name="client_last_name" value="${application.client_last_name || ''}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_first_name" value="${application.client_first_name || ''}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_middle_name" value="${application.client_middle_name || ''}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="client_extension" value="${application.client_extension || ''}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_sex" value="Male" ${application.client_sex === "Male" ? "checked" : ""} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="client_sex" value="Female" ${application.client_sex === "Female" ? "checked" : ""} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" name="client_dob_year" value="${this.formatDateForForm(application.client_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" name="client_dob_month" value="${this.formatDateForForm(application.client_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" name="client_dob_day" value="${this.formatDateForForm(application.client_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" name="client_address" value="${application.client_address || ''}" readonly>
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
                                <input type="text" name="client_place_of_birth" value="${application.client_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>6. Relationship to Beneficiary</label>
                                <input type="text" name="relationship_to_beneficiary" value="${application.relationship_to_beneficiary || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>7. Civil Status</label>
                                <input type="text" name="civil_status" value="${application.civil_status || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>8. Religion</label>
                                <input type="text" name="religion" value="${application.religion || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>9. Nationality</label>
                                <input type="text" name="nationality" value="${application.nationality || 'Filipino'}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>10. Highest Educational Attainment</label>
                                <input type="text" name="education" value="${application.education || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>11. Skills/Occupation*</label>
                                <input type="text" name="occupation" value="${application.occupation || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>12. Estimated Monthly Income</label>
                                <div class="income-field">
                                    <span>₱</span>
                                    <input type="text" name="monthly_income" value="${application.monthly_income || ''}" readonly>

                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-3">
                                <label>13. PhilHealth No.</label>
                                <input type="text" name="philhealth_no" value="${application.philhealth_no || ''}" readonly>
                            </div>
                            <div class="form-group col-2">
                                <label>14. Mode of Admission*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="admission_mode" value="Online" ${application.admission_mode === "Online" ? "checked" : ""} disabled> Online
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="admission_mode" value="Referral" ${application.admission_mode === "Referral" ? "checked" : ""} disabled> Referral
                                    </label>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>15. Referring party</label>
                                <input type="text" name="referring_party" value="${application.referring_party || ''}" readonly>
                            </div>
                            <div class="form-group col-3">
                                <label class="mt-1">16. Contact #</label>
                                <input type="text" name="contact_number" value="${application.contact_number || ''}" readonly>
                            </div>
                        </div>
    `
  }

  renderBeneficiaryIdentifyingSection(application) {
    return `
                        <div class="form-row">
                            <div class="form-group col-12">
                                <div class="category-checkboxes">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Informal Settler Family" ${application.category === "Informal Settler Family" ? "checked" : ""} disabled> Informal Settler Family
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Disadvantaged Individual" ${application.category === "Disadvantaged Individual" ? "checked" : ""} disabled> Disadvantaged Individual
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Indigenous People" ${application.category === "Indigenous People" ? "checked" : ""} disabled> Indigenous People
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="category" value="Pantawid Beneficiary" ${application.category === "Pantawid Beneficiary" ? "checked" : ""} disabled> Pantawid Beneficiary
                                    </label>
                                    ${application.category === 'Pantawid Beneficiary' ? `
                                        <div class="id-field">
                                            <span>ID No.</span>
                                            <input type="text" name="category_id_no" value="${application.category_id_no || ''}" readonly>
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
                                        <input type="text" name="beneficiary_last_name" value="${application.beneficiary_last_name}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_first_name" value="${application.beneficiary_first_name}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_middle_name" value="${application.beneficiary_middle_name}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" name="beneficiary_extension" value="${application.beneficiary_extension}" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-1">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="beneficiary_sex" value="Male" ${application.beneficiary_sex === "Male" ? "checked" : ""} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="beneficiary_sex" value="Female" ${application.beneficiary_sex === "Female" ? "checked" : ""} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" name="beneficiary_dob_year" value="${this.formatDateForForm(application.beneficiary_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" name="beneficiary_dob_month" value="${this.formatDateForForm(application.beneficiary_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" name="beneficiary_dob_day" value="${this.formatDateForForm(application.beneficiary_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <input type="text" name="beneficiary_address" value="${application.beneficiary_address || ''}" readonly>
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
                                <input type="text" name="beneficiary_place_of_birth" value="${application.beneficiary_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>6. Civil Status</label>
                                <input type="text" name="beneficiary_civil_status" value="${application.beneficiary_civil_status || ''}" readonly>
                            </div>
                        </div>
    `
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
                  <td><input type="text" name="full_name" value="${member.full_name || ''}" readonly></td>
                  <td><input type="text" name="sex" value="${member.sex || ''}" readonly></td>
                  <td><input type="text" name="birthdate" value="${member.birthdate ? this.formatDateForForm(member.birthdate, 'full') : ''}" readonly></td>
                  <td><input type="text" name="civil_status" value="${member.civil_status || ''}" readonly></td>
                  <td><input type="text" name="relationship" value="${member.relationship || ''}" readonly></td>
                  <td><input type="text" name="education" value="${member.education || ''}" readonly></td>
                  <td><input type="text" name="occupation" value="${member.occupation || ''}" readonly></td>
                  <td><input type="text" name="monthly_income" value="${member.monthly_income || ''}" readonly></td>
              </tr>
          `);
      }
      return rows.join('');
  }

  formatDateForForm(dateString, part) {
    if (!dateString) return ""
    const date = new Date(dateString)
    if (part === "year") return date.getFullYear().toString()
    if (part === "month") return (date.getMonth() + 1).toString().padStart(2, "0")
    if (part === "day") return date.getDate().toString().padStart(2, "0")
    if (part === "full")
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
    return ""
  }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        })
    }


    showError(message) {
        this.showAlert(message, 'danger');
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

let approverBeneficiaries
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
    approverBeneficiaries = new ApproverBeneficiaries();
});