-- =============================================
-- CENTRALIZED AICS SUPPORT DATABASE SCHEMA
-- Includes complete applications table columns
-- =============================================

CREATE DATABASE IF NOT EXISTS u185323956_aics_system;
USE u185323956_aics_system;

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    description TEXT,
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,

    -- Client Info
    client_full_name VARCHAR(255) NOT NULL,
    client_first_name VARCHAR(100),
    client_last_name VARCHAR(100),
    client_middle_name VARCHAR(100),
    client_extension VARCHAR(10),
    client_sex ENUM('Male', 'Female') NOT NULL,
    client_dob DATE NOT NULL,
    client_address TEXT NOT NULL,
    client_place_of_birth VARCHAR(255),
    relationship_to_beneficiary VARCHAR(100),
    civil_status VARCHAR(50),
    religion VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Filipino',
    education VARCHAR(255),
    occupation VARCHAR(255),
    monthly_income DECIMAL(10,2) DEFAULT 0.00,
    philhealth_no VARCHAR(50),
    admission_mode ENUM('Online', 'Referral') DEFAULT 'Online',
    referring_party VARCHAR(255),

    -- Beneficiary Info
    beneficiary_full_name VARCHAR(255) NOT NULL,
    beneficiary_last_name VARCHAR(100),
    beneficiary_first_name VARCHAR(100),
    beneficiary_middle_name VARCHAR(100),
    beneficiary_extension VARCHAR(10),
    beneficiary_sex ENUM('Male', 'Female') NOT NULL,
    beneficiary_dob DATE NOT NULL,
    beneficiary_address TEXT NOT NULL,
    beneficiary_place_of_birth VARCHAR(255),
    beneficiary_civil_status VARCHAR(50),

    -- Program and Category
    category ENUM('Informal Settler Family', 'Disadvantaged Individual', 'Indigenous People', 'Pantawid Beneficiary') NOT NULL,
    category_id_no VARCHAR(50),

    -- Assistance Details
    payee_name VARCHAR(255),
    payee_address TEXT,
    problems_presented TEXT,
    social_worker_assessment TEXT,
    client_category VARCHAR(100),
    client_subcategory VARCHAR(100),
    service_type_nature VARCHAR(100),
    financial_type VARCHAR(100),
    material_assistance VARCHAR(100),
    recommended_assistance TEXT,
    assistance_amount DECIMAL(10,2) DEFAULT 0.00,
    assistance_subtotal DECIMAL(10,2) DEFAULT 0.00,
    assistance_mode VARCHAR(50),
    assistance_source VARCHAR(50),
    transport_mode VARCHAR(100),
    financial_others_specify VARCHAR(255),
    material_others_specify VARCHAR(255),

    -- Interview Details
    interview_date DATE,
    interview_time TIME,

    -- Signatures and Staff Info
    signature_path VARCHAR(255),
    staff_full_name VARCHAR(255),
    staff_license_number VARCHAR(100),
    approver_signature_path VARCHAR(255),
    mayor_signature_path VARCHAR(255),
    staff_signature_path VARCHAR(255),

    -- Contact Info
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),

    -- Relations
    service_type INT NOT NULL,
    status ENUM(
        'Pending for approval',
        'Approved',
        'Rejected',
        'Waiting for approval of head',
        'Waiting for approval of city mayor',
        'Ready for release',
        'Released'
    ) DEFAULT 'Pending for approval',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (service_type) REFERENCES programs(id),
    INDEX idx_reference_no (reference_no),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_service_type (service_type),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    sex ENUM('Male', 'Female'),
    birthdate DATE,
    civil_status VARCHAR(50),
    relationship VARCHAR(100),
    education VARCHAR(255),
    occupation VARCHAR(255),
    monthly_income DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_application_id (application_id)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_application_id (application_id)
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'approver', 'citymayor') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    e_signature VARCHAR(100),
    license_number VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    application_id INT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id),
    FOREIGN KEY (application_id) REFERENCES applications(id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- E-signatures table
CREATE TABLE IF NOT EXISTS e_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    user_id INT NOT NULL,
    signature_data TEXT NOT NULL,
    signature_position VARCHAR(50) NOT NULL DEFAULT 'interviewer',
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (user_id) REFERENCES admin_users(id),
    UNIQUE KEY unique_app_user_position (application_id, user_id, signature_position),
    INDEX idx_application_id (application_id),
    INDEX idx_user_id (user_id)
);

-- Default programs
INSERT IGNORE INTO programs (id, name, department, description, requirements) VALUES
(1, 'Transportation Assistance', 'CSWDO', 'Financial assistance for transportation needs during emergencies or crisis situations.', 'Police Blotter/Report, SCSR, Voter\'s ID/Government ID, Court Order/Subpoena/Referral'),
(2, 'Medical Assistance', 'AksyonBilis', 'Support for medical expenses including consultations, medications, and treatments.', 'Certificate of Indigency, Medical Certificate/Abstract, Medical Documents, Voter\'s ID or Affidavit'),
(3, 'Burial Assistance','AksyonBilis', 'Financial aid for burial and funeral expenses during family bereavement.', 'Death Certificate, Funeral Contract, Voter\'s ID or Affidavit'),
(4, 'PWD Assistance', 'AksyonBilis', 'Specialized assistance for Persons with Disabilities including medical and mobility support.', 'Certificate of Indigency, Medical Certificate/Abstract, Hospital Bills/Prescription, PWD ID, Voter\'s ID or Affidavit'),
(5, 'Issuance of Case Study Report (Medical Assistance)','CSWDO', 'Documentation services for medical assistance case studies and reports.', 'Medical Certificate, Medical Abstract, Hospital Bill, Voter\'s/Government ID, Authorization (if representative)'),
(6, 'Issuance of Case Study Report (Financial Assistance)','CSWDO', 'Documentation services for financial assistance case studies and reports.', 'Certificate of Indigency, Request Letter, Voter\'s/Government ID, Authorization (if representative)'),
(7, 'Issuance of Case Study Report (Guarantee Letter)','CSWDO', 'Documentation services for guarantee letter case studies and reports.', 'Certificate of Indigency, Request Letter, Voter\'s/Government ID, Authorization (if representative)'),
(8, 'Referral/Endorsement Letter for Consultation','CSWDO', 'Official referral letters for medical consultations and specialist appointments.', 'Barangay Indigency Certificate, Voter\'s ID/Affidavit or Senior ID'),
(9, 'Endorsement Letter for Laboratory Services & Minor Procedures','CSWDO', 'Endorsement letters for laboratory tests and minor medical procedures.', 'Barangay Indigency Certificate, Voter\'s ID/Affidavit or Senior ID, Request from Physician');

-- Default admin users
INSERT IGNORE INTO admin_users 
(username, password, role, full_name, department, license_number, e_signature, email) VALUES
('cswdo', '$2y$10$xz13dxw648ouYv8K2NbK9u/9AZeCnwtdBsd2RCjy/7b/6gTw6hxYO', 'admin', 'CSWDO Staff 1', 'CSWDO', NULL, NULL, 'admin@aics-portal.gov.ph'),
('aksyonbilis', '$2y$10$xz13dxw648ouYv8K2NbK9u/9AZeCnwtdBsd2RCjy/7b/6gTw6hxYO', 'admin', 'AksyonBilis Staff 1', 'AksyonBilis', NULL, NULL, 'admin@aics-portal.gov.ph'),
('approver', '$2y$10$xz13dxw648ouYv8K2NbK9u/9AZeCnwtdBsd2RCjy/7b/6gTw6hxYO', 'approver', 'Application Approver', 'CSWDO', NULL, NULL, 'approver@aics-portal.gov.ph'),
('citymayor', '$2y$10$xz13dxw648ouYv8K2NbK9u/9AZeCnwtdBsd2RCjy/7b/6gTw6hxYO', 'citymayor', 'City Mayor', 'CSWDO', NULL, NULL, 'mayor@aics-portal.gov.ph');

-- Dashboard statistics view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    COUNT(CASE WHEN status = 'Pending for approval' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN status = 'Approved' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN status = 'Rejected' THEN 1 END) AS rejected_count,
    COUNT(CASE WHEN status = 'Waiting for approval of head' THEN 1 END) AS waiting_head_count,
    COUNT(CASE WHEN status = 'Waiting for approval of city mayor' THEN 1 END) AS waiting_mayor_count,
    COUNT(CASE WHEN status = 'Ready for release' THEN 1 END) AS ready_count,
    COUNT(CASE WHEN status = 'Released' THEN 1 END) AS released_count,
    COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS today_submissions,
    COUNT(CASE WHEN DATE(updated_at) = CURDATE() AND status IN ('Approved', 'Ready for release') THEN 1 END) AS today_approvals
FROM applications;
