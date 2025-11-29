// Utility functions
const utils = {
    showAlert(message, type = "info") {
        // Create alert container if it doesn't exist
        let container = document.getElementById('alert-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'alert-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
            document.body.appendChild(container);
        }

        // Create alert box
        const alertBox = document.createElement("div");
        alertBox.className = `alert alert-${type} alert-dismissible fade show shadow-sm`;
        alertBox.style.cssText = 'margin-bottom: 10px;';
        alertBox.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Append to container
        container.appendChild(alertBox);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            alertBox.classList.remove('show');
            setTimeout(() => alertBox.remove(), 150);
        }, 4000);
    }
};
class ApplicationForm {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.uploadedFiles = [];
        this.selectedService = null;
        this.tempReferenceNumber = null; // Store temp reference
        
        this.init();
    }

    init() {
        this.loadServices();
        this.setupEventListeners();
        this.checkURLParams();
        this.addInitialFamilyMember();
        this.tempReferenceNumber = 'TEMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('service');
        if (serviceId) {
            this.preSelectService(serviceId);
        }
    }

    async preSelectService(serviceId) {
        // Wait a bit for services to load
        setTimeout(() => {
            const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
            if (serviceCard) {
                serviceCard.click();
            }
        }, 500);
    }

    setupEventListeners() {
        // Step navigation
        document.getElementById('next-step-1').addEventListener('click', () => {
            const privacyModal = new bootstrap.Modal(document.getElementById('dataPrivacyModal'));
            privacyModal.show();

            const consentCheckbox = document.getElementById('privacy-consent');
            const agreeBtn = document.getElementById('agreePrivacyBtn');

            // Enable Proceed button only when checkbox is checked
            consentCheckbox.addEventListener('change', () => {
                agreeBtn.disabled = !consentCheckbox.checked;
            });

            // Proceed to Step 2 when user agrees
            agreeBtn.addEventListener('click', () => {
                privacyModal.hide();
                this.nextStep(); // go to Personal Details
            });
        });
        document.getElementById('prev-step-2').addEventListener('click', () => this.prevStep());
        document.getElementById('next-step-2').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-3').addEventListener('click', () => this.prevStep());
        document.getElementById('next-step-3').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-4').addEventListener('click', () => this.prevStep());
        this.setupSignaturePad();

        // Form submission
        document.getElementById('application-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitApplication();
        });

        // Family member management
        document.getElementById('add-family-member').addEventListener('click', () => {
            this.addFamilyMember();
        });

        // Category selection
        document.querySelectorAll('input[name="category"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const pantawidSection = document.getElementById('pantawid-id');
                if (radio.value === 'Pantawid Beneficiary' && radio.checked) {
                    pantawidSection.style.display = 'block';
                } else {
                    pantawidSection.style.display = 'none';
                }
            });
        });

        // File upload
        this.setupFileUpload();
    }
    

    async loadServices() {
        try {
            const response = await fetch('api/programs.php');
            const programs = await response.json();
            
            if (programs.success) {
                this.renderServices(programs.data);
            } else {
                this.showError('Failed to load services');
            }
        } catch (error) {
            console.error('Error loading services:', error);
            this.showError('Network error while loading services');
        }
    }

    renderServices(services) {
        const container = document.getElementById('service-options');
        if (!container) return;

        container.innerHTML = services.map(service => `
            <div class="col-md-6 col-lg-4">
                <div class="card service-option h-100" data-service-id="${service.id}">
                    <div class="card-body text-center p-4">
                        <div class="program-icon bg-primary text-white mb-3">
                            <i class="bi ${this.getProgramIcon(service.name)}"></i>
                        </div>
                        <h6 class="card-title fw-bold">${service.name}</h6>
                        <p class="card-text small text-muted">${service.description}</p>
                        <input type="radio" name="service_type" value="${service.id}" data-requirements="${service.requirements}">
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for service selection
        document.querySelectorAll('.service-option').forEach(card => {
            card.addEventListener('click', () => {
                this.selectService(card);
            });
        });
    }

    selectService(selectedCard) {
        // Remove previous selections
        document.querySelectorAll('.service-option').forEach(card => {
            card.classList.remove('selected');
        });

        // Select current card
        selectedCard.classList.add('selected');
        const radio = selectedCard.querySelector('input[type="radio"]');
        radio.checked = true;
        
        this.selectedService = {
            id: radio.value,
            requirements: radio.dataset.requirements
        };

        // Enable next button
        document.getElementById('next-step-1').disabled = false;
    }

    addInitialFamilyMember() {
        this.addFamilyMember();
    }

    addFamilyMember() {
        const tbody = document.getElementById('family-tbody');
        const row = document.createElement('tr');
        const rowIndex = tbody.children.length;

        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" name="family_name_${rowIndex}" placeholder="Full Name"></td>
            <td>
                <select class="form-select form-select-sm" name="family_sex_${rowIndex}">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
            </td>
            <td><input type="date" class="form-control form-control-sm" name="family_birthdate_${rowIndex}"></td>
            <td>
                <select class="form-select form-select-sm" name="family_civil_status_${rowIndex}">
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm" name="family_relationship_${rowIndex}" placeholder="Relationship"></td>
            <td><input type="text" class="form-control form-control-sm" name="family_education_${rowIndex}" placeholder="Education"></td>
            <td><input type="text" class="form-control form-control-sm" name="family_occupation_${rowIndex}" placeholder="Occupation"></td>
            <td><input type="number" class="form-control form-control-sm" name="family_income_${rowIndex}" step="0.01" placeholder="0.00"></td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    }

    setupFileUpload() {
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('file-upload');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                this.uploadFile(file);
            }
        });
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            utils.showAlert('File size must be less than 10MB', 'warning');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            utils.showAlert('Only PDF, JPG, and PNG files are allowed', 'warning');
            return false;
        }

        return true;
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Always use temp reference for uploads during form filling
        formData.append('reference_no', this.tempReferenceNumber);

        try {
            const response = await fetch('api/upload.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            console.log('Upload response:', result); // Debug log
            
            if (result.success && result.data) {
                this.uploadedFiles.push({
                    name: result.data.original_name || file.name,
                    path: result.data.path,
                    type: result.data.type || file.type,
                    size: result.data.size || file.size,
                    temp_path: result.data.path
                });
                this.renderUploadedFiles();
                console.log('File uploaded successfully:', result.data.path);
            } else {
                console.error('Upload failed:', result);
                utils.showAlert(result.message || 'Upload failed', 'danger');
            }
        } catch (error) {
            console.error('Upload error:', error);
            utils.showAlert('Network error during upload', 'danger');
        }
    }
    renderUploadedFiles() {
        const container = document.getElementById('uploaded-files');
        if (!container) return;

        container.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="col-md-6 col-lg-4">
                <div class="file-item">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${file.name}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="applicationForm.removeFile(${index})">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-file-earmark me-1"></i>
                        ${this.formatFileSize(file.size)}
                    </small>
                </div>
            </div>
        `).join('');
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderUploadedFiles();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.showStep(this.currentStep);
            this.updateProgress();

            if (this.currentStep === 3) {
                this.loadRequirements();
            } else if (this.currentStep === 4) {
                this.generateReview();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgress();
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step-${stepNumber}`).classList.add('active');

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            
            if (index + 1 === stepNumber) {
                indicator.classList.add('active');
            } else if (index + 1 < stepNumber) {
                indicator.classList.add('completed');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateProgress() {
        const progressPercent = (this.currentStep / this.totalSteps) * 100;
        document.getElementById('progress-bar').style.width = progressPercent + '%';
    }

    validateCurrentStep() {
        if (this.currentStep === 1) {
            if (!this.selectedService) {
                utils.showAlert('Please select a service/program', 'warning');
                return false;
            }
        } else if (this.currentStep === 2) {
            const requiredFields = document.querySelectorAll('#step-2 [required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });

            if (!isValid) {
                utils.showAlert('Please fill in all required fields', 'warning');
                return false;
            }

            // Validate at least one category is selected
            const categorySelected = document.querySelector('input[name="category"]:checked');
            if (!categorySelected) {
                utils.showAlert('Please select a beneficiary category', 'warning');
                return false;
            }
        } else if (this.currentStep === 3) {
            // Validate that at least one document is uploaded
            if (this.uploadedFiles.length === 0) {
                utils.showAlert('Please upload the required documents before proceeding', 'warning');
                return false;
            }
        }

        return true;
    }

    loadRequirements() {
        if (!this.selectedService) return;

        const container = document.getElementById('requirements-list');
        const requirements = this.selectedService.requirements.split(',').map(req => req.trim());
        
        container.innerHTML = `
            <div class="list-group">
                ${requirements.map((req, index) => `
                    <div class="list-group-item">
                        <i class="bi bi-file-earmark-text text-primary me-2"></i>
                        ${req}
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateReview() {
        const formData = new FormData(document.getElementById('application-form'));
        const reviewContainer = document.getElementById('review-content');
        
        // Get family members data
        const familyMembers = this.getFamilyMembersData();
        
        reviewContainer.innerHTML = `
            <div class="accordion" id="reviewAccordion">
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingService">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseService">
                            <i class="bi bi-clipboard-check me-2"></i>Selected Service
                        </button>
                    </h2>
                    <div id="collapseService" class="accordion-collapse collapse show" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="d-flex justify-content-between">
                                <span>Program:</span>
                                <strong>${document.querySelector('input[name="service_type"]:checked')?.closest('.service-option').querySelector('.card-title').textContent || 'Not selected'}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingClient">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseClient">
                            <i class="bi bi-person me-2"></i>Client Information
                        </button>
                    </h2>
                    <div id="collapseClient" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="row g-2">
                                <div class="col-12"><strong>Name:</strong> ${formData.get('client_last_name')}, ${formData.get('client_first_name')} ${formData.get('client_middle_name') || ''}</div>
                                <div class="col-md-6"><strong>Sex:</strong> ${formData.get('client_sex')}</div>
                                <div class="col-md-6"><strong>Date of Birth:</strong> ${formData.get('client_dob')}</div>
                                <div class="col-12"><strong>Address:</strong> ${formData.get('client_address')}</div>
                                <div class="col-md-6"><strong>Civil Status:</strong> ${formData.get('civil_status')}</div>
                                <div class="col-md-6"><strong>Email:</strong> ${formData.get('email')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingBeneficiary">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBeneficiary">
                            <i class="bi bi-person-heart me-2"></i>Beneficiary Information
                        </button>
                    </h2>
                    <div id="collapseBeneficiary" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="row g-2">
                                <div class="col-12"><strong>Name:</strong> ${formData.get('beneficiary_last_name')}, ${formData.get('beneficiary_first_name')} ${formData.get('beneficiary_middle_name') || ''}</div>
                                <div class="col-md-6"><strong>Category:</strong> ${formData.get('category')}</div>
                                <div class="col-md-6"><strong>Sex:</strong> ${formData.get('beneficiary_sex')}</div>
                                <div class="col-12"><strong>Address:</strong> ${formData.get('beneficiary_address')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingFamily">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFamily">
                            <i class="bi bi-people me-2"></i>Family Composition (${familyMembers.length} members)
                        </button>
                    </h2>
                    <div id="collapseFamily" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            ${familyMembers.length > 0 ? this.renderFamilyReview(familyMembers) : 'No family members added'}
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingDocuments">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocuments">
                            <i class="bi bi-files me-2"></i>Uploaded Documents (${this.uploadedFiles.length} files)
                        </button>
                    </h2>
                    <div id="collapseDocuments" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            ${this.uploadedFiles.length > 0 ? this.renderDocumentsReview() : 'No documents uploaded'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFamilyMembersData() {
        const tbody = document.getElementById('family-tbody');
        const familyMembers = [];
        
        Array.from(tbody.children).forEach((row, index) => {
            const inputs = row.querySelectorAll('input, select');
            const member = {};
            
            inputs.forEach(input => {
                if (input.name && input.value.trim()) {
                    const fieldName = input.name.replace(`_${index}`, '').replace('family_', '');
                    member[fieldName] = input.value.trim();
                }
            });

            if (Object.keys(member).length > 0) {
                familyMembers.push(member);
            }
        });

        return familyMembers;
    }

    renderFamilyReview(familyMembers) {
        return `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Sex</th>
                            <th>Birthdate</th>
                            <th>Relationship</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${familyMembers.map(member => `
                            <tr>
                                <td>${member.name || ''}</td>
                                <td>${member.sex || ''}</td>
                                <td>${member.birthdate || ''}</td>
                                <td>${member.relationship || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDocumentsReview() {
        return `
            <div class="list-group">
                ${this.uploadedFiles.map(file => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-file-earmark me-2"></i>
                            ${file.name}
                        </div>
                        <small class="text-muted">${this.formatFileSize(file.size)}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }
    setupSignaturePad() {
        const canvas = document.getElementById('signature-pad');
        const uploadArea = document.getElementById('signature-upload-area');
        const fileInput = document.getElementById('signature-file-input');
        const preview = document.getElementById('signature-preview');
        const previewImg = document.getElementById('signature-preview-img');

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let drawing = false;
        let activePointerId = null;

        // Resize canvas to actual display size & account for devicePixelRatio
        const resizeCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            // Use bounding rect to get the displayed CSS size
            let rect = canvas.getBoundingClientRect();
            let cssWidth = rect.width;
            let cssHeight = rect.height || 200; // fallback height if not set

            // If element is hidden (width 0), try parent's clientWidth
            if (cssWidth === 0) {
                const parent = canvas.parentElement;
                cssWidth = parent ? parent.clientWidth : 600;
            }

            // Set CSS size (keeps element visually the same)
            canvas.style.width = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';

            // Set actual pixel dimensions multiplied by DPR
            canvas.width = Math.round(cssWidth * ratio);
            canvas.height = Math.round(cssHeight * ratio);

            // Reset any transforms and scale drawing operations to DPR
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(ratio, ratio);

            // Set drawing style in CSS pixels (so values like lineWidth = 2 look correct)
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000';
        };

        // Call initially
        resizeCanvas();

        // Watch for size changes of the canvas container (good for responsive layouts)
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0) resizeCanvas();
                }
            });
            ro.observe(canvas.parentElement);
        } else {
            // Fallback
            window.addEventListener('resize', resizeCanvas);
        }

        // Convert event to coordinates relative to the canvas's CSS box (not raw pixels)
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            if (e.touches && e.touches[0]) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            } else {
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }
        };

        // Begin path helpers
        const beginAt = (x, y) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        // Pointer events (preferred)
        if (window.PointerEvent) {
            canvas.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                drawing = true;
                activePointerId = e.pointerId;
                try { canvas.setPointerCapture(activePointerId); } catch (err) { /* ignore */ }
                const pos = getPos(e);
                beginAt(pos.x, pos.y);
            }, { passive: false });

            canvas.addEventListener('pointermove', (e) => {
                if (!drawing || e.pointerId !== activePointerId) return;
                e.preventDefault();
                const pos = getPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                this.updateSignatureData();
            }, { passive: false });

            const pointerUpHandler = (e) => {
                if (!drawing || e.pointerId !== activePointerId) return;
                drawing = false;
                try { canvas.releasePointerCapture(activePointerId); } catch (err) { /* ignore */ }
                activePointerId = null;
                ctx.closePath();
                this.updateSignatureData();
            };

            canvas.addEventListener('pointerup', pointerUpHandler);
            canvas.addEventListener('pointercancel', pointerUpHandler);
            canvas.addEventListener('pointerleave', pointerUpHandler);
        } else {
            // Mouse & touch fallback
            canvas.addEventListener('mousedown', (e) => {
                e.preventDefault();
                drawing = true;
                const pos = getPos(e);
                beginAt(pos.x, pos.y);
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!drawing) return;
                e.preventDefault();
                const pos = getPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                this.updateSignatureData();
            });

            const stopMouse = (e) => {
                if (!drawing) return;
                drawing = false;
                ctx.closePath();
                this.updateSignatureData();
            };

            canvas.addEventListener('mouseup', stopMouse);
            canvas.addEventListener('mouseleave', stopMouse);

            // Touch
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                drawing = true;
                const pos = getPos(e);
                beginAt(pos.x, pos.y);
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                if (!drawing) return;
                e.preventDefault();
                const pos = getPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                this.updateSignatureData();
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                if (!drawing) return;
                drawing = false;
                ctx.closePath();
                this.updateSignatureData();
            });
        }

        // Clear function that correctly clears the high-DPI buffer
        const clearCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            // Reset transform, clear the full pixel buffer, then reapply scale
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(ratio, ratio);
            // Also clear hidden field
            const hidden = document.getElementById('signature-data');
            if (hidden) hidden.value = '';
        };

        // Clear button
        const clearBtn = document.getElementById('clear-signature');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                clearCanvas();
            });
        }

        // Toggle draw/upload
        const toggleUploadBtn = document.getElementById('toggle-upload-signature');
        const toggleDrawBtn = document.getElementById('toggle-draw-signature');

        if (toggleUploadBtn) {
            toggleUploadBtn.addEventListener('click', () => {
                document.getElementById('signature-pad-section').style.display = 'none';
                document.getElementById('signature-upload-section').style.display = 'block';
            });
        }
        if (toggleDrawBtn) {
            toggleDrawBtn.addEventListener('click', () => {
                document.getElementById('signature-upload-section').style.display = 'none';
                document.getElementById('signature-pad-section').style.display = 'block';
                // small timeout so layout settles, then resize
                setTimeout(() => resizeCanvas(), 50);
            });
        }

        // File upload handlers (same behaviour as before)
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('border-primary', 'bg-light');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('border-primary', 'bg-light');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-primary', 'bg-light');
                this.handleSignatureFile(e.dataTransfer.files[0]);
            });

            fileInput.addEventListener('change', (e) => {
                this.handleSignatureFile(e.target.files[0]);
            });

            const removeBtn = document.getElementById('remove-uploaded-signature');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    if (preview) preview.style.display = 'none';
                    if (previewImg) previewImg.src = '';
                    const hidden = document.getElementById('signature-data');
                    if (hidden) hidden.value = '';
                    fileInput.value = '';
                    // restore draw canvas
                    clearCanvas();
                    document.getElementById('signature-pad-section').style.display = 'block';
                    document.getElementById('signature-upload-section').style.display = 'none';
                    setTimeout(() => resizeCanvas(), 50);
                });
            }
        }
    }
    
    handleSignatureFile(file) {
        if (!file) return;
        
        // Validate file
        const maxSize = 2 * 1024 * 1024; // 2MB
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        
        if (file.size > maxSize) {
            utils.showAlert('File size must be less than 2MB', 'warning');
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            utils.showAlert('Only PNG and JPG files are allowed', 'warning');
            return;
        }
        
        // Read and preview file
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('signature-preview');
            const previewImg = document.getElementById('signature-preview-img');
            
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                
                // Store signature data
                document.getElementById('signature-data').value = e.target.result;
                
                // Clear canvas if user uploaded a file
                const canvas = document.getElementById('signature-pad');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        };
        reader.readAsDataURL(file);
    }
    
    updateSignatureData() {
        const canvas = document.getElementById('signature-pad');
        if (canvas) {
            const signatureData = canvas.toDataURL('image/png');
            document.getElementById('signature-data').value = signatureData;
        }
    }


    async submitApplication() {
        const signatureData = document.getElementById('signature-data').value;
        const signatureConfirmation = document.getElementById('signature-confirmation').checked;

        if (!signatureData || signatureData.trim() === '') {
            utils.showAlert('Please provide your signature before submitting', 'warning');
            return;
        }
        if (!signatureConfirmation) {
            utils.showAlert('Please confirm your signature authorization', 'warning');
            return;
        }

        const submitBtn = document.getElementById('submit-application');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner me-2"></span>Sending OTP...';

        try {
            const email = document.querySelector('input[name="email"]').value;

            // Request OTP from backend
            const otpResponse = await fetch('api/send_otp.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const otpResult = await otpResponse.json();

            if (!otpResult.success) {
                utils.showAlert(otpResult.message || 'Failed to send OTP. Please try again.', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Application';
                return;
            }

            // Show OTP modal
            const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));
            otpModal.show();

            document.getElementById('verify-otp-btn').onclick = async () => {
                const otp = document.getElementById('otp-input').value.trim();
                if (otp.length !== 6) {
                    document.getElementById('otp-error').textContent = 'Please enter a valid 6-digit OTP.';
                    return;
                }

                const verifyResponse = await fetch('api/verify_otp.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });
                const verifyResult = await verifyResponse.json();

                if (verifyResult.success) {
                    otpModal.hide();
                    this.finalizeApplication();
                } else {
                    document.getElementById('otp-error').textContent = 'Invalid OTP. Please try again.';
                }
            };

        } catch (error) {
            console.error('OTP Error:', error);
            utils.showAlert('Error during OTP process', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Application';
        }
    }
    async finalizeApplication() {
        const submitBtn = document.getElementById('submit-application');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner me-2"></span>Submitting...';

        try {
            const formData = new FormData(document.getElementById('application-form'));
            formData.append('signature_data', document.getElementById('signature-data').value);
            formData.append('temp_reference_no', this.tempReferenceNumber);
            formData.append('uploaded_files', JSON.stringify(this.uploadedFiles));
            formData.append('family_members', JSON.stringify(this.getFamilyMembersData()));

            const response = await fetch('api/apply.php', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                document.getElementById('reference-number').textContent = result.data.reference_number;
                const modal = new bootstrap.Modal(document.getElementById('successModal'));
                modal.show();
            } else {
                utils.showAlert(result.message || 'Application submission failed', 'danger');
            }
        } catch (error) {
            console.error('Submission error:', error);
            utils.showAlert('Network error during submission', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Application';
        }
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
        utils.showAlert(message, 'danger');
    }
    
}

// Global variable to access from HTML onclick handlers
let applicationForm;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    applicationForm = new ApplicationForm();
});