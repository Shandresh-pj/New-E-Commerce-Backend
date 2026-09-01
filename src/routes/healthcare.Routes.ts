import { Router } from "express";
import {
  doctorController, patientController, appointmentController,
  consultationController, prescriptionController, medicineController,
  pharmacyPosController, stockApprovalHcController, medicineExpiryController,
} from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const HC_ADMIN = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.HOSPITAL_ADMIN];
const HC_ALL   = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.HOSPITAL_ADMIN, UserType.DOCTOR, UserType.PHARMACIST, UserType.RECEPTIONIST, UserType.EMPLOYEE];
const PHARMA   = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.HOSPITAL_ADMIN, UserType.PHARMACIST];
const DOCTOR_ROLES = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.HOSPITAL_ADMIN, UserType.DOCTOR];

/**
 * @swagger
 * components:
 *   schemas:
 *     Doctor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Dr. Sarah Jenkins"
 *         specialization:
 *           type: string
 *           example: "Cardiology"
 *         qualification:
 *           type: string
 *           example: "MBBS, MD"
 *         experience_years:
 *           type: integer
 *           example: 8
 *         registration_number:
 *           type: string
 *           example: "MCI-2023-88910"
 *         registration_body:
 *           type: string
 *           example: "Medical Council of India"
 *         license_no:
 *           type: string
 *           example: "MCI-2023-88910"
 *         phone:
 *           type: string
 *           example: "+91 9876543210"
 *         email:
 *           type: string
 *           example: "sarah.jenkins@hospital.com"
 *         consultation_fee:
 *           type: number
 *           example: 500
 *         bio:
 *           type: string
 *           example: "Senior Cardiologist with 8+ years experience"
 *         description:
 *           type: string
 *           example: "Senior Cardiologist with 8+ years experience"
 *         is_active:
 *           type: boolean
 *           example: true
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 45
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Patient:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           example: "+91 9876543211"
 *         email:
 *           type: string
 *           example: "john.doe@example.com"
 *         dob:
 *           type: string
 *           format: date
 *           example: "1985-06-15"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           example: "Male"
 *         blood_group:
 *           type: string
 *           example: "O+"
 *         address:
 *           type: string
 *           example: "123 Main Street, City"
 *         allergies:
 *           type: string
 *           example: "Penicillin"
 *         medical_history:
 *           type: string
 *           example: "Hypertension"
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         patient_id:
 *           type: integer
 *           example: 1
 *         doctor_id:
 *           type: integer
 *           example: 1
 *         scheduled_at:
 *           type: string
 *           format: date-time
 *           example: "2026-09-01T10:00:00.000Z"
 *         status:
 *           type: string
 *           enum: [BOOKED, CONFIRMED, CHECKED_IN, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW]
 *           example: "BOOKED"
 *         reason:
 *           type: string
 *           example: "Routine cardiac checkup"
 *         notes:
 *           type: string
 *           example: "Patient reported mild chest pressure"
 *         token_number:
 *           type: string
 *           example: "T-102"
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Consultation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         doctor_id:
 *           type: integer
 *           example: 1
 *         patient_id:
 *           type: integer
 *           example: 1
 *         appointment_id:
 *           type: integer
 *           example: 1
 *         chief_complaint:
 *           type: string
 *           example: "Chest tightness and fatigue"
 *         diagnosis:
 *           type: string
 *           example: "Mild Essential Hypertension"
 *         clinical_notes:
 *           type: string
 *           example: "BP: 140/90. Recommended ECG and salt reduction."
 *         vitals:
 *           type: object
 *           example: { bp: "140/90", pulse: "78", temp: "98.6F" }
 *         status:
 *           type: string
 *           enum: [IN_PROGRESS, COMPLETED, CANCELLED]
 *           example: "COMPLETED"
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     PrescriptionItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         prescription_id:
 *           type: integer
 *           example: 1
 *         medicine_id:
 *           type: integer
 *           example: 5
 *         dosage:
 *           type: string
 *           example: "500mg"
 *         duration_days:
 *           type: integer
 *           example: 7
 *         frequency:
 *           type: string
 *           example: "1-0-1"
 *         instructions:
 *           type: string
 *           example: "Take after meals"
 *
 *     Prescription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         doctor_id:
 *           type: integer
 *           example: 1
 *         patient_id:
 *           type: integer
 *           example: 1
 *         consultation_id:
 *           type: integer
 *           example: 1
 *         advice:
 *           type: string
 *           example: "Drink plenty of water and avoid strenuous exertion."
 *         status:
 *           type: string
 *           enum: [DRAFT, FINALIZED]
 *           example: "FINALIZED"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PrescriptionItem'
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Medicine:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Paracetamol 500mg"
 *         generic_name:
 *           type: string
 *           example: "Acetaminophen"
 *         brand:
 *           type: string
 *           example: "Calpol"
 *         category:
 *           type: string
 *           example: "Tablet"
 *         composition:
 *           type: string
 *           example: "Paracetamol IP 500mg"
 *         manufacturer:
 *           type: string
 *           example: "GSK Pharma"
 *         hsn_code:
 *           type: string
 *           example: "30049099"
 *         batch_no:
 *           type: string
 *           example: "BATCH-2026-08"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2027-12-31"
 *         cost_price:
 *           type: number
 *           example: 12.50
 *         sale_price:
 *           type: number
 *           example: 20.00
 *         mrp:
 *           type: number
 *           example: 22.00
 *         current_stock:
 *           type: integer
 *           example: 500
 *         min_stock_level:
 *           type: integer
 *           example: 50
 *         is_active:
 *           type: boolean
 *           example: true
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     PharmacySaleItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         sale_id:
 *           type: integer
 *           example: 1
 *         medicine_id:
 *           type: integer
 *           example: 1
 *         quantity:
 *           type: integer
 *           example: 2
 *         unit_price:
 *           type: number
 *           example: 20.00
 *         total_price:
 *           type: number
 *           example: 40.00
 *
 *     PharmacySale:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         patient_id:
 *           type: integer
 *           example: 1
 *         prescription_id:
 *           type: integer
 *           example: 1
 *         payment_mode:
 *           type: string
 *           enum: [CASH, CARD, UPI, NET_BANKING]
 *           example: "UPI"
 *         total_amount:
 *           type: number
 *           example: 100.00
 *         discount_amount:
 *           type: number
 *           example: 10.00
 *         net_amount:
 *           type: number
 *           example: 90.00
 *         status:
 *           type: string
 *           enum: [COMPLETED, CANCELLED]
 *           example: "COMPLETED"
 *         sold_by:
 *           type: integer
 *           example: 5
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PharmacySaleItem'
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     HealthcareStockApproval:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         medicine_id:
 *           type: integer
 *           example: 1
 *         requested_qty:
 *           type: integer
 *           example: 100
 *         quantity:
 *           type: integer
 *           example: 100
 *         unit_cost:
 *           type: number
 *           example: 15.00
 *         purchase_price:
 *           type: number
 *           example: 15.00
 *         mrp:
 *           type: number
 *           example: 25.00
 *         batch_no:
 *           type: string
 *           example: "BATCH-2026-09"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2028-06-30"
 *         supplier:
 *           type: string
 *           example: "MedSupply Corp"
 *         notes:
 *           type: string
 *           example: "Restock required for Q3"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *           example: "PENDING"
 *         reject_reason:
 *           type: string
 *           example: ""
 *         requested_by:
 *           type: integer
 *           example: 3
 *         approved_by:
 *           type: integer
 *           example: 1
 *         company_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DOCTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Doctors
 *   description: Doctor management endpoints and user login account setup
 */

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: List all doctors with search, status filter, and pagination
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by doctor name, specialization, qualification, registration number, or email
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter active (true) or inactive (false) doctor profiles
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Filter doctors by tenant company ID
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter doctors by assigned branch ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Array of doctor records with total count and pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Doctor'
 *                 total:
 *                   type: integer
 *                   example: 1
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 50
 */
router.get("/doctors", authenticateMiddleware, authorize({ roles: HC_ALL }), doctorController.getAll.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor profile by ID
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor unique record ID
 *     responses:
 *       200:
 *         description: Doctor record details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 *       404:
 *         description: Doctor record not found
 */
router.get("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), doctorController.getById.bind(doctorController));

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Register a new doctor & create user account with temporary password email
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: "REQUIRED: Doctor full name (e.g. Sarah Jenkins or Dr. Sarah Jenkins)"
 *                 example: "Dr. Sarah Jenkins"
 *               specialization:
 *                 type: string
 *                 description: "OPTIONAL: Medical specialization"
 *                 example: "Cardiology"
 *               qualification:
 *                 type: string
 *                 description: "OPTIONAL: Degree / Qualifications"
 *                 example: "MBBS, MD"
 *               experience_years:
 *                 type: integer
 *                 description: "OPTIONAL: Years of practice experience"
 *                 example: 8
 *               registration_number:
 *                 type: string
 *                 description: "OPTIONAL: Council registration or license number"
 *                 example: "MCI-2023-88910"
 *               registration_body:
 *                 type: string
 *                 description: "OPTIONAL: Medical Licensing Body"
 *                 example: "Medical Council of India"
 *               phone:
 *                 type: string
 *                 description: "OPTIONAL: Primary contact phone number"
 *                 example: "+91 9876543210"
 *               email:
 *                 type: string
 *                 description: "OPTIONAL: Doctor email address used for portal login creation"
 *                 example: "sarah.jenkins@hospital.com"
 *               consultation_fee:
 *                 type: number
 *                 description: "OPTIONAL: Consultation fee in INR"
 *                 example: 500
 *               description:
 *                 type: string
 *                 description: "OPTIONAL: Doctor biography or clinical profile notes"
 *                 example: "Senior Cardiologist with 8+ years experience"
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: "OPTIONAL: Active status indicator"
 *               company_id:
 *                 type: integer
 *                 description: "OPTIONAL: Assigned company ID (defaults to logged-in user company)"
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 description: "OPTIONAL: Assigned branch ID (defaults to logged-in user branch)"
 *                 example: 1
 *               send_email_credentials:
 *                 type: boolean
 *                 default: true
 *                 description: "OPTIONAL: Send automated email with login username & temporary password"
 *     responses:
 *       201:
 *         description: Doctor registered successfully and credentials email dispatched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 *                 message:
 *                   type: string
 *                   example: "Doctor registered successfully and login credentials sent to sarah.jenkins@hospital.com"
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already in use
 */
router.post("/doctors", authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.create.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   put:
 *     summary: Update doctor details and synchronize associated user account credentials
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "OPTIONAL: Updated doctor name"
 *               specialization:
 *                 type: string
 *                 description: "OPTIONAL: Updated specialization"
 *               qualification:
 *                 type: string
 *                 description: "OPTIONAL: Updated qualification"
 *               experience_years:
 *                 type: integer
 *                 description: "OPTIONAL: Updated experience years"
 *               registration_number:
 *                 type: string
 *                 description: "OPTIONAL: Updated registration number"
 *               registration_body:
 *                 type: string
 *                 description: "OPTIONAL: Updated registration body"
 *               phone:
 *                 type: string
 *                 description: "OPTIONAL: Updated contact phone"
 *               email:
 *                 type: string
 *                 description: "OPTIONAL: Updated doctor login email"
 *               consultation_fee:
 *                 type: number
 *                 description: "OPTIONAL: Updated consultation fee"
 *               description:
 *                 type: string
 *                 description: "OPTIONAL: Updated profile bio"
 *               is_active:
 *                 type: boolean
 *                 description: "OPTIONAL: Active or inactive status"
 *               company_id:
 *                 type: integer
 *                 description: "OPTIONAL: Updated company ID"
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 description: "OPTIONAL: Updated branch ID"
 *                 example: 1
 *               send_email_credentials:
 *                 type: boolean
 *                 description: "OPTIONAL: Re-send updated login email"
 *     responses:
 *       200:
 *         description: Doctor updated successfully
 *       404:
 *         description: Doctor not found
 */
router.put("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.update.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   delete:
 *     summary: Deactivate or permanently delete a doctor profile and user login access
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set to true for permanent database deletion, false for soft deactivation
 *     responses:
 *       200:
 *         description: Doctor profile deactivated or deleted successfully
 *       404:
 *         description: Doctor not found
 */
router.delete("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.delete.bind(doctorController));

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Patients
 *   description: Patient management, medical history, and clinical records
 */

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: List registered patients
 *     tags: [Healthcare - Patients]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name, phone, or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of patients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/patients", authenticateMiddleware, authorize({ roles: HC_ALL }), patientController.getAll.bind(patientController));

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     summary: Get patient profile by ID
 *     tags: [Healthcare - Patients]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient profile record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Patient not found
 */
router.get("/patients/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), patientController.getById.bind(patientController));

/**
 * @swagger
 * /patients/{id}/history:
 *   get:
 *     summary: Get patient consultation history & clinical timeline
 *     tags: [Healthcare - Patients]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient consultation history records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Consultation'
 */
router.get("/patients/:id/history", authenticateMiddleware, authorize({ roles: HC_ALL }), patientController.getHistory.bind(patientController));

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Register a new patient
 *     tags: [Healthcare - Patients]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: "REQUIRED: Patient full name"
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 description: "OPTIONAL: Contact phone number"
 *                 example: "+91 9876543211"
 *               email:
 *                 type: string
 *                 description: "OPTIONAL: Patient email address"
 *                 example: "john.doe@example.com"
 *               dob:
 *                 type: string
 *                 description: "OPTIONAL: Date of birth (YYYY-MM-DD)"
 *                 example: "1985-06-15"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: "OPTIONAL: Gender"
 *                 example: "Male"
 *               blood_group:
 *                 type: string
 *                 description: "OPTIONAL: Blood group"
 *                 example: "O+"
 *               address:
 *                 type: string
 *                 description: "OPTIONAL: Residential address"
 *                 example: "123 Main Street, City"
 *               allergies:
 *                 type: string
 *                 description: "OPTIONAL: Known drug/food allergies"
 *                 example: "Penicillin"
 *               medical_history:
 *                 type: string
 *                 description: "OPTIONAL: Pre-existing medical conditions"
 *                 example: "Hypertension"
 *     responses:
 *       201:
 *         description: Patient registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *                 message:
 *                   type: string
 *                   example: "Patient registered"
 */
router.post("/patients", authenticateMiddleware, authorize({ roles: HC_ALL }), patientController.create.bind(patientController));

/**
 * @swagger
 * /patients/{id}:
 *   put:
 *     summary: Update patient profile
 *     tags: [Healthcare - Patients]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "OPTIONAL: Updated patient name"
 *               phone:
 *                 type: string
 *                 description: "OPTIONAL: Updated phone"
 *               email:
 *                 type: string
 *                 description: "OPTIONAL: Updated email"
 *               dob:
 *                 type: string
 *                 description: "OPTIONAL: Updated DOB (YYYY-MM-DD)"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: "OPTIONAL: Updated gender"
 *               blood_group:
 *                 type: string
 *                 description: "OPTIONAL: Updated blood group"
 *               address:
 *                 type: string
 *                 description: "OPTIONAL: Updated address"
 *               allergies:
 *                 type: string
 *                 description: "OPTIONAL: Updated allergies"
 *               medical_history:
 *                 type: string
 *                 description: "OPTIONAL: Updated medical history"
 *     responses:
 *       200:
 *         description: Patient profile updated
 *       404:
 *         description: Patient not found
 */
router.put("/patients/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), patientController.update.bind(patientController));

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Appointments
 *   description: Appointment scheduling and status transitions
 */

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: List appointments with status, doctor, patient, and date filters
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BOOKED, CONFIRMED, CHECKED_IN, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW]
 *         description: Filter by appointment status
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: integer
 *         description: Filter by Doctor ID
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *         description: Filter by Patient ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Start date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: End date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Appointments list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/appointments", authenticateMiddleware, authorize({ roles: HC_ALL }), appointmentController.getAll.bind(appointmentController));

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get appointment details by ID
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 */
router.get("/appointments/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), appointmentController.getById.bind(appointmentController));

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new patient appointment
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - doctor_id
 *               - scheduled_at
 *             properties:
 *               patient_id:
 *                 type: integer
 *                 description: "REQUIRED: Patient ID"
 *                 example: 1
 *               doctor_id:
 *                 type: integer
 *                 description: "REQUIRED: Doctor ID"
 *                 example: 1
 *               scheduled_at:
 *                 type: string
 *                 description: "REQUIRED: ISO 8601 scheduled date & time"
 *                 example: "2026-09-01T10:00:00.000Z"
 *               reason:
 *                 type: string
 *                 description: "OPTIONAL: Reason for visit"
 *                 example: "Routine cardiac checkup"
 *               notes:
 *                 type: string
 *                 description: "OPTIONAL: Clinical appointment notes"
 *                 example: "Patient reported mild chest pressure"
 *               token_number:
 *                 type: string
 *                 description: "OPTIONAL: Queue token number"
 *                 example: "T-102"
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *                 message:
 *                   type: string
 *                   example: "Appointment booked"
 */
router.post("/appointments", authenticateMiddleware, authorize({ roles: HC_ALL }), appointmentController.create.bind(appointmentController));

/**
 * @swagger
 * /appointments/{id}:
 *   put:
 *     summary: Update appointment details
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_at:
 *                 type: string
 *                 description: "OPTIONAL: Rescheduled date & time"
 *               reason:
 *                 type: string
 *                 description: "OPTIONAL: Updated reason"
 *               notes:
 *                 type: string
 *                 description: "OPTIONAL: Updated notes"
 *     responses:
 *       200:
 *         description: Appointment updated
 *       404:
 *         description: Appointment not found
 */
router.put("/appointments/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), appointmentController.update.bind(appointmentController));

/**
 * @swagger
 * /appointments/{id}/status:
 *   patch:
 *     summary: Transition appointment status
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [BOOKED, CONFIRMED, CHECKED_IN, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW]
 *                 description: "REQUIRED: Next appointment status"
 *                 example: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Appointment not found
 *       422:
 *         description: Invalid status transition
 */
router.patch("/appointments/:id/status", authenticateMiddleware, authorize({ roles: HC_ALL }), appointmentController.updateStatus.bind(appointmentController));

/**
 * @swagger
 * /appointments/{id}:
 *   delete:
 *     summary: Cancel an appointment
 *     tags: [Healthcare - Appointments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment cancelled
 *       404:
 *         description: Appointment not found
 */
router.delete("/appointments/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), appointmentController.cancel.bind(appointmentController));

// ═══════════════════════════════════════════════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Consultations
 *   description: Doctor consultation records and diagnosis documentation
 */

/**
 * @swagger
 * /consultations:
 *   get:
 *     summary: List consultations with doctor, patient, status, search, and pagination filters
 *     tags: [Healthcare - Consultations]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by chief complaint or clinical diagnosis
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: integer
 *         description: Filter by Doctor ID
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *         description: Filter by Patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by consultation status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Consultations list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Consultation'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/consultations", authenticateMiddleware, authorize({ roles: HC_ALL }), consultationController.getAll.bind(consultationController));

/**
 * @swagger
 * /consultations/{id}:
 *   get:
 *     summary: Get consultation by ID
 *     tags: [Healthcare - Consultations]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Consultation ID
 *     responses:
 *       200:
 *         description: Consultation record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Consultation'
 *       404:
 *         description: Consultation not found
 */
router.get("/consultations/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), consultationController.getById.bind(consultationController));

/**
 * @swagger
 * /consultations:
 *   post:
 *     summary: Start a new consultation record
 *     tags: [Healthcare - Consultations]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctor_id
 *               - patient_id
 *             properties:
 *               doctor_id:
 *                 type: integer
 *                 description: "REQUIRED: Doctor ID"
 *                 example: 1
 *               patient_id:
 *                 type: integer
 *                 description: "REQUIRED: Patient ID"
 *                 example: 1
 *               appointment_id:
 *                 type: integer
 *                 description: "OPTIONAL: Associated Appointment ID"
 *                 example: 1
 *               chief_complaint:
 *                 type: string
 *                 description: "OPTIONAL: Primary symptom / chief complaint"
 *                 example: "Chest tightness and fatigue"
 *               diagnosis:
 *                 type: string
 *                 description: "OPTIONAL: Clinical diagnosis"
 *                 example: "Mild Essential Hypertension"
 *               clinical_notes:
 *                 type: string
 *                 description: "OPTIONAL: Detailed clinical examination notes"
 *                 example: "BP: 140/90. Recommended ECG."
 *               vitals:
 *                 type: object
 *                 description: "OPTIONAL: Vitals JSON object (BP, Pulse, Temp)"
 *                 example: { bp: "140/90", pulse: "78", temp: "98.6F" }
 *     responses:
 *       201:
 *         description: Consultation record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Consultation'
 *                 message:
 *                   type: string
 *                   example: "Consultation created"
 */
router.post("/consultations", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), consultationController.create.bind(consultationController));

/**
 * @swagger
 * /consultations/{id}:
 *   put:
 *     summary: Update consultation notes & diagnosis
 *     tags: [Healthcare - Consultations]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Consultation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chief_complaint:
 *                 type: string
 *                 description: "OPTIONAL: Updated chief complaint"
 *               diagnosis:
 *                 type: string
 *                 description: "OPTIONAL: Updated diagnosis"
 *               clinical_notes:
 *                 type: string
 *                 description: "OPTIONAL: Updated examination notes"
 *               vitals:
 *                 type: object
 *                 description: "OPTIONAL: Updated vitals object"
 *     responses:
 *       200:
 *         description: Consultation updated successfully
 *       404:
 *         description: Consultation not found
 */
router.put("/consultations/:id", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), consultationController.update.bind(consultationController));

/**
 * @swagger
 * /consultations/{id}/complete:
 *   post:
 *     summary: Mark consultation as completed
 *     tags: [Healthcare - Consultations]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Consultation ID
 *     responses:
 *       200:
 *         description: Consultation status marked as COMPLETED
 *       404:
 *         description: Consultation not found
 */
router.post("/consultations/:id/complete", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), consultationController.complete.bind(consultationController));

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Prescriptions
 *   description: Digital prescription creation and medication dosage timing
 */

/**
 * @swagger
 * /prescriptions:
 *   get:
 *     summary: List prescriptions with doctor, patient, status, and pagination filters
 *     tags: [Healthcare - Prescriptions]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: integer
 *         description: Filter by Doctor ID
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *         description: Filter by Patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, FINALIZED]
 *         description: Filter by prescription status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Prescriptions list with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Prescription'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/prescriptions", authenticateMiddleware, authorize({ roles: HC_ALL }), prescriptionController.getAll.bind(prescriptionController));

/**
 * @swagger
 * /prescriptions/{id}:
 *   get:
 *     summary: Get prescription details by ID
 *     tags: [Healthcare - Prescriptions]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prescription ID
 *     responses:
 *       200:
 *         description: Prescription details with items list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Prescription'
 *       404:
 *         description: Prescription not found
 */
router.get("/prescriptions/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), prescriptionController.getById.bind(prescriptionController));

/**
 * @swagger
 * /prescriptions:
 *   post:
 *     summary: Create a prescription with medication items
 *     tags: [Healthcare - Prescriptions]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctor_id
 *               - patient_id
 *               - items
 *             properties:
 *               doctor_id:
 *                 type: integer
 *                 description: "REQUIRED: Doctor ID"
 *                 example: 1
 *               patient_id:
 *                 type: integer
 *                 description: "REQUIRED: Patient ID"
 *                 example: 1
 *               consultation_id:
 *                 type: integer
 *                 description: "OPTIONAL: Consultation ID"
 *                 example: 1
 *               advice:
 *                 type: string
 *                 description: "OPTIONAL: General advice / dietary instructions"
 *                 example: "Drink plenty of water and avoid salt."
 *               items:
 *                 type: array
 *                 description: "REQUIRED: List of prescribed medicines"
 *                 items:
 *                   type: object
 *                   required: [medicine_id, dosage, duration_days, frequency]
 *                   properties:
 *                     medicine_id:
 *                       type: integer
 *                       description: "REQUIRED: Medicine ID"
 *                       example: 1
 *                     dosage:
 *                       type: string
 *                       description: "REQUIRED: Dosage (e.g. 500mg, 1 tablet)"
 *                       example: "500mg"
 *                     duration_days:
 *                       type: integer
 *                       description: "REQUIRED: Duration in days"
 *                       example: 7
 *                     frequency:
 *                       type: string
 *                       description: "REQUIRED: Frequency (e.g. 1-0-1, 1-1-1)"
 *                       example: "1-0-1"
 *                     instructions:
 *                       type: string
 *                       description: "OPTIONAL: Intake instructions"
 *                       example: "Take after meals"
 *     responses:
 *       201:
 *         description: Prescription created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Prescription'
 *                 message:
 *                   type: string
 *                   example: "Prescription created"
 */
router.post("/prescriptions", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), prescriptionController.create.bind(prescriptionController));

/**
 * @swagger
 * /prescriptions/{id}:
 *   put:
 *     summary: Update prescription items or advice
 *     tags: [Healthcare - Prescriptions]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prescription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               advice:
 *                 type: string
 *                 description: "OPTIONAL: Updated advice"
 *               items:
 *                 type: array
 *                 description: "OPTIONAL: Updated prescription items array"
 *                 items:
 *                   type: object
 *                   required: [medicine_id, dosage, duration_days, frequency]
 *                   properties:
 *                     medicine_id:
 *                       type: integer
 *                     dosage:
 *                       type: string
 *                     duration_days:
 *                       type: integer
 *                     frequency:
 *                       type: string
 *                     instructions:
 *                       type: string
 *     responses:
 *       200:
 *         description: Prescription updated
 *       400:
 *         description: Cannot update a finalized prescription
 *       404:
 *         description: Prescription not found
 */
router.put("/prescriptions/:id", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), prescriptionController.update.bind(prescriptionController));

/**
 * @swagger
 * /prescriptions/{id}/finalize:
 *   post:
 *     summary: Finalize prescription and issue to pharmacy
 *     tags: [Healthcare - Prescriptions]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prescription ID
 *     responses:
 *       200:
 *         description: Prescription finalized successfully
 *       404:
 *         description: Prescription not found
 */
router.post("/prescriptions/:id/finalize", authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }), prescriptionController.finalize.bind(prescriptionController));

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Medicines
 *   description: Medicine master catalog and inventory stock tracking
 */

/**
 * @swagger
 * /medicines/search:
 *   get:
 *     summary: Fast autocomplete search for active medicines with available stock
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for medicine name, brand, or generic molecule
 *     responses:
 *       200:
 *         description: Search results array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Medicine'
 */
router.get("/medicines/search", authenticateMiddleware, authorize({ roles: HC_ALL }), medicineController.search.bind(medicineController));

/**
 * @swagger
 * /medicines/expiring:
 *   get:
 *     summary: Get expiring medicines list categorized by expiry risk
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Expiry threshold days ahead
 *     responses:
 *       200:
 *         description: List of medicines near expiration (categorized as EXPIRED, CRITICAL, EXPIRING_SOON)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Medicine'
 *                 total:
 *                   type: integer
 */
router.get("/medicines/expiring", authenticateMiddleware, authorize({ roles: PHARMA }), medicineController.getExpiring.bind(medicineController));

/**
 * @swagger
 * /medicines:
 *   get:
 *     summary: List medicine catalog with filters and pagination
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, generic name, brand, or composition
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter active (true) or inactive (false) medicines
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Medicines list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Medicine'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/medicines", authenticateMiddleware, authorize({ roles: HC_ALL }), medicineController.getAll.bind(medicineController));

/**
 * @swagger
 * /medicines/{id}:
 *   get:
 *     summary: Get medicine details by ID
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *       404:
 *         description: Medicine not found
 */
router.get("/medicines/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), medicineController.getById.bind(medicineController));

/**
 * @swagger
 * /medicines/{id}/batches:
 *   get:
 *     summary: Get available batch and stock information for a medicine
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medicine ID
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter available stock batches only
 *     responses:
 *       200:
 *         description: Medicine batch records array
 *       404:
 *         description: Medicine not found
 */
router.get("/medicines/:id/batches", authenticateMiddleware, authorize({ roles: HC_ALL }), async (req: any, res: any) => {
  try {
    const repo = require("../config/database").default.getRepository(
      require("../entities/healthcare2.entity").Medicine
    );
    const med = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!med) return res.status(404).json({ success: false, message: "Medicine not found" });

    const available = req.query.available === "true";
    if (available && med.current_stock <= 0) {
      return res.json({ success: true, data: [] });
    }

    return res.json({
      success: true,
      data: [{
        id:            med.id,
        batch_id:      med.id,
        batch_number:  med.batch_no || `BATCH-${med.id}`,
        expiry_date:   med.expiry_date,
        quantity:      med.current_stock,
        selling_price: med.sale_price,
        mrp:           med.mrp,
      }],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /medicines:
 *   post:
 *     summary: Create a new medicine entry in master catalog
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - sale_price
 *             properties:
 *               name:
 *                 type: string
 *                 description: "REQUIRED: Medicine trade name"
 *                 example: "Paracetamol 500mg"
 *               category:
 *                 type: string
 *                 description: "REQUIRED: Category (e.g. Tablet, Syrup, Injection)"
 *                 example: "Tablet"
 *               sale_price:
 *                 type: number
 *                 description: "REQUIRED: Selling price per unit"
 *                 example: 20.00
 *               generic_name:
 *                 type: string
 *                 description: "OPTIONAL: Generic chemical name"
 *                 example: "Acetaminophen"
 *               brand:
 *                 type: string
 *                 description: "OPTIONAL: Brand name"
 *                 example: "Calpol"
 *               composition:
 *                 type: string
 *                 description: "OPTIONAL: Chemical composition"
 *                 example: "Paracetamol IP 500mg"
 *               manufacturer:
 *                 type: string
 *                 description: "OPTIONAL: Manufacturer"
 *                 example: "GSK Pharma"
 *               hsn_code:
 *                 type: string
 *                 description: "OPTIONAL: HSN Code"
 *                 example: "30049099"
 *               batch_no:
 *                 type: string
 *                 description: "OPTIONAL: Initial batch number"
 *                 example: "BATCH-2026-08"
 *               expiry_date:
 *                 type: string
 *                 description: "OPTIONAL: Expiry date (YYYY-MM-DD)"
 *                 example: "2027-12-31"
 *               cost_price:
 *                 type: number
 *                 description: "OPTIONAL: Unit cost price"
 *                 example: 12.50
 *               mrp:
 *                 type: number
 *                 description: "OPTIONAL: Maximum retail price"
 *                 example: 22.00
 *               current_stock:
 *                 type: integer
 *                 description: "OPTIONAL: Initial stock quantity"
 *                 example: 500
 *               min_stock_level:
 *                 type: integer
 *                 description: "OPTIONAL: Reorder threshold"
 *                 example: 50
 *     responses:
 *       201:
 *         description: Medicine created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Medicine'
 *                 message:
 *                   type: string
 *                   example: "Medicine created"
 */
router.post("/medicines", authenticateMiddleware, authorize({ roles: PHARMA }), medicineController.create.bind(medicineController));

/**
 * @swagger
 * /medicines/{id}:
 *   put:
 *     summary: Update medicine master details
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medicine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "OPTIONAL: Updated trade name"
 *               generic_name:
 *                 type: string
 *                 description: "OPTIONAL: Updated generic name"
 *               brand:
 *                 type: string
 *                 description: "OPTIONAL: Updated brand name"
 *               category:
 *                 type: string
 *                 description: "OPTIONAL: Updated category"
 *               composition:
 *                 type: string
 *                 description: "OPTIONAL: Updated composition"
 *               sale_price:
 *                 type: number
 *                 description: "OPTIONAL: Updated sale price"
 *               cost_price:
 *                 type: number
 *                 description: "OPTIONAL: Updated cost price"
 *               mrp:
 *                 type: number
 *                 description: "OPTIONAL: Updated MRP"
 *               current_stock:
 *                 type: integer
 *                 description: "OPTIONAL: Updated stock quantity"
 *               min_stock_level:
 *                 type: integer
 *                 description: "OPTIONAL: Updated minimum stock level threshold"
 *               is_active:
 *                 type: boolean
 *                 description: "OPTIONAL: Active status"
 *     responses:
 *       200:
 *         description: Medicine updated successfully
 *       404:
 *         description: Medicine not found
 */
router.put("/medicines/:id", authenticateMiddleware, authorize({ roles: PHARMA }), medicineController.update.bind(medicineController));

/**
 * @swagger
 * /medicines/{id}:
 *   delete:
 *     summary: Deactivate medicine entry
 *     tags: [Healthcare - Medicines]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine deactivated
 *       404:
 *         description: Medicine not found
 */
router.delete("/medicines/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), medicineController.delete.bind(medicineController));

// ═══════════════════════════════════════════════════════════════════════════════
// PHARMACY POS — Sales
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Pharmacy POS
 *   description: Pharmacy point-of-sale — atomic medicine sales with stock deduction
 */

/**
 * @swagger
 * /pharmacy-pos/sales:
 *   get:
 *     summary: List pharmacy POS billing sales with filters
 *     tags: [Healthcare - Pharmacy POS]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *         description: Filter by Patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [COMPLETED, CANCELLED]
 *         description: Filter by Sale status
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Start date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: End date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Sales list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PharmacySale'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/pharmacy-pos/sales", authenticateMiddleware, authorize({ roles: PHARMA }), pharmacyPosController.getAll.bind(pharmacyPosController));

/**
 * @swagger
 * /pharmacy-pos/sales/{id}:
 *   get:
 *     summary: Get sale invoice details by ID
 *     tags: [Healthcare - Pharmacy POS]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale invoice details with line items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PharmacySale'
 *       404:
 *         description: Sale invoice not found
 */
router.get("/pharmacy-pos/sales/:id", authenticateMiddleware, authorize({ roles: PHARMA }), pharmacyPosController.getById.bind(pharmacyPosController));

/**
 * @swagger
 * /pharmacy-pos/sales:
 *   post:
 *     summary: Create a pharmacy POS sale transaction & deduct stock atomically
 *     tags: [Healthcare - Pharmacy POS]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_mode
 *               - items
 *             properties:
 *               payment_mode:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, NET_BANKING]
 *                 description: "REQUIRED: Payment method"
 *                 example: "UPI"
 *               patient_id:
 *                 type: integer
 *                 description: "OPTIONAL: Patient ID"
 *                 example: 1
 *               prescription_id:
 *                 type: integer
 *                 description: "OPTIONAL: Prescription ID"
 *                 example: 1
 *               discount_amount:
 *                 type: number
 *                 description: "OPTIONAL: Discount amount applied to total sale"
 *                 example: 10.00
 *               items:
 *                 type: array
 *                 description: "REQUIRED: Line items being sold"
 *                 items:
 *                   type: object
 *                   required: [medicine_id, quantity, unit_price]
 *                   properties:
 *                     medicine_id:
 *                       type: integer
 *                       description: "REQUIRED: Medicine ID"
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       description: "REQUIRED: Quantity sold"
 *                       example: 2
 *                     unit_price:
 *                       type: number
 *                       description: "REQUIRED: Unit sale price"
 *                       example: 20.00
 *     responses:
 *       201:
 *         description: Sale created and medicine stock deducted atomically
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PharmacySale'
 *                 message:
 *                   type: string
 *                   example: "Sale created successfully"
 *       400:
 *         description: Sale contains no items
 *       409:
 *         description: Insufficient stock available for requested medicine
 */
router.post("/pharmacy-pos/sales", authenticateMiddleware, authorize({ roles: PHARMA }), pharmacyPosController.create.bind(pharmacyPosController));

/**
 * @swagger
 * /pharmacy/sale:
 *   post:
 *     summary: Compatibility alias endpoint for creating a pharmacy sale
 *     tags: [Healthcare - Pharmacy POS]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payment_mode, items]
 *             properties:
 *               payment_mode:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, NET_BANKING]
 *               patient_id:
 *                 type: integer
 *               prescription_id:
 *                 type: integer
 *               discount_amount:
 *                 type: number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [medicine_id, quantity, unit_price]
 *                   properties:
 *                     medicine_id: { type: integer }
 *                     quantity: { type: integer }
 *                     unit_price: { type: number }
 *     responses:
 *       201:
 *         description: Sale created successfully
 */
router.post("/pharmacy/sale", authenticateMiddleware, authorize({ roles: PHARMA }), pharmacyPosController.create.bind(pharmacyPosController));

/**
 * @swagger
 * /pharmacy-pos/sales/{id}/cancel:
 *   patch:
 *     summary: Cancel sale and restore medicine stock
 *     tags: [Healthcare - Pharmacy POS]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale cancelled and stock restored
 *       400:
 *         description: Sale is already cancelled
 *       404:
 *         description: Sale not found
 */
router.patch("/pharmacy-pos/sales/:id/cancel", authenticateMiddleware, authorize({ roles: HC_ADMIN }), pharmacyPosController.cancel.bind(pharmacyPosController));

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK APPROVALS (Healthcare)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Stock Approvals
 *   description: Medicine stock purchase approval workflow
 */

/**
 * @swagger
 * /stock-approvals:
 *   get:
 *     summary: List stock purchase requisitions with status filter and pagination
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by requisition status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Stock approvals list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HealthcareStockApproval'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/stock-approvals", authenticateMiddleware, authorize({ roles: HC_ALL }), stockApprovalHcController.getAll.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}:
 *   get:
 *     summary: Get stock purchase requisition details
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     responses:
 *       200:
 *         description: Stock approval record details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/HealthcareStockApproval'
 *       404:
 *         description: Stock approval not found
 */
router.get("/stock-approvals/:id", authenticateMiddleware, authorize({ roles: HC_ALL }), stockApprovalHcController.getById.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals:
 *   post:
 *     summary: Submit a medicine stock purchase requisition
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicine_id
 *               - requested_qty
 *             properties:
 *               medicine_id:
 *                 type: integer
 *                 description: "REQUIRED: Medicine ID"
 *                 example: 1
 *               requested_qty:
 *                 type: integer
 *                 description: "REQUIRED: Quantity requested"
 *                 example: 100
 *               unit_cost:
 *                 type: number
 *                 description: "OPTIONAL: Estimated unit purchase cost"
 *                 example: 15.00
 *               purchase_price:
 *                 type: number
 *                 description: "OPTIONAL: Actual purchase price"
 *                 example: 15.00
 *               mrp:
 *                 type: number
 *                 description: "OPTIONAL: Maximum retail price"
 *                 example: 25.00
 *               batch_no:
 *                 type: string
 *                 description: "OPTIONAL: Batch number"
 *                 example: "BATCH-2026-09"
 *               expiry_date:
 *                 type: string
 *                 description: "OPTIONAL: Expiry date (YYYY-MM-DD)"
 *                 example: "2028-06-30"
 *               supplier:
 *                 type: string
 *                 description: "OPTIONAL: Vendor / Supplier name"
 *                 example: "MedSupply Corp"
 *               notes:
 *                 type: string
 *                 description: "OPTIONAL: Requisition notes"
 *                 example: "Restock required for Q3"
 *     responses:
 *       201:
 *         description: Stock purchase requisition submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/HealthcareStockApproval'
 *                 message:
 *                   type: string
 *                   example: "Stock approval request created"
 */
router.post("/stock-approvals", authenticateMiddleware, authorize({ roles: PHARMA }), stockApprovalHcController.create.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}:
 *   put:
 *     summary: Update a pending stock purchase requisition
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               medicine_id:
 *                 type: integer
 *                 description: "OPTIONAL: Medicine ID"
 *               requested_qty:
 *                 type: integer
 *                 description: "OPTIONAL: Requested quantity"
 *               quantity:
 *                 type: integer
 *                 description: "OPTIONAL: Approved quantity"
 *               unit_cost:
 *                 type: number
 *                 description: "OPTIONAL: Unit cost"
 *               purchase_price:
 *                 type: number
 *                 description: "OPTIONAL: Purchase price"
 *               mrp:
 *                 type: number
 *                 description: "OPTIONAL: MRP"
 *               batch_no:
 *                 type: string
 *                 description: "OPTIONAL: Batch number"
 *               expiry_date:
 *                 type: string
 *                 description: "OPTIONAL: Expiry date (YYYY-MM-DD)"
 *               supplier:
 *                 type: string
 *                 description: "OPTIONAL: Supplier"
 *               notes:
 *                 type: string
 *                 description: "OPTIONAL: Notes"
 *     responses:
 *       200:
 *         description: Requisition updated
 *       400:
 *         description: Only PENDING approvals can be edited
 *       404:
 *         description: Stock approval not found
 */
router.put("/stock-approvals/:id", authenticateMiddleware, authorize({ roles: PHARMA }), stockApprovalHcController.update.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}/approve:
 *   post:
 *     summary: Approve stock purchase requisition and increment medicine inventory stock
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     responses:
 *       200:
 *         description: Stock requisition approved and medicine stock updated
 *       400:
 *         description: Requisition is not in PENDING state
 *       404:
 *         description: Stock approval not found
 */
router.post("/stock-approvals/:id/approve", authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.approve.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}/approve:
 *   patch:
 *     summary: Compatibility PATCH endpoint to approve stock purchase requisition
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     responses:
 *       200:
 *         description: Stock requisition approved
 */
router.patch("/stock-approvals/:id/approve", authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.approve.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}/reject:
 *   post:
 *     summary: Reject stock purchase requisition with reason
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: "OPTIONAL: Reason for rejection"
 *                 example: "Supplier price exceeds budget"
 *     responses:
 *       200:
 *         description: Stock requisition rejected
 *       400:
 *         description: Requisition is not in PENDING state
 *       404:
 *         description: Stock approval not found
 */
router.post("/stock-approvals/:id/reject", authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.reject.bind(stockApprovalHcController));

/**
 * @swagger
 * /stock-approvals/{id}/reject:
 *   patch:
 *     summary: Compatibility PATCH endpoint to reject stock purchase requisition
 *     tags: [Healthcare - Stock Approvals]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock Approval ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: "OPTIONAL: Reason for rejection"
 *     responses:
 *       200:
 *         description: Stock requisition rejected
 */
router.patch("/stock-approvals/:id/reject", authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.reject.bind(stockApprovalHcController));

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINE EXPIRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Medicine Expiry
 *   description: Expiry tracking — EXPIRING_SOON, CRITICAL, EXPIRED
 */

/**
 * @swagger
 * /medicine-expiry:
 *   get:
 *     summary: Get detailed list of expiring and expired medicine batches
 *     tags: [Healthcare - Medicine Expiry]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Expiry threshold horizon in days
 *     responses:
 *       200:
 *         description: Expiring batches list with days_to_expiry and expiry_status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Medicine'
 *                       - type: object
 *                         properties:
 *                           days_to_expiry:
 *                             type: integer
 *                             example: 15
 *                           expiry_status:
 *                             type: string
 *                             enum: [EXPIRED, CRITICAL, EXPIRING_SOON]
 *                             example: "CRITICAL"
 *                 total:
 *                   type: integer
 */
router.get("/medicine-expiry", authenticateMiddleware, authorize({ roles: PHARMA }), medicineExpiryController.getAll.bind(medicineExpiryController));

/**
 * @swagger
 * /medicine-expiry/summary:
 *   get:
 *     summary: Get medicine expiry dashboard KPI summary counts
 *     tags: [Healthcare - Medicine Expiry]
 *     security: [{bearerAuth: []}]
 *     responses:
 *       200:
 *         description: Summary counts of expired, critical (<=30 days), and expiring soon (<=90 days) batches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     expired:
 *                       type: integer
 *                       example: 2
 *                     critical:
 *                       type: integer
 *                       example: 5
 *                     expiring_soon:
 *                       type: integer
 *                       example: 12
 */
router.get("/medicine-expiry/summary", authenticateMiddleware, authorize({ roles: PHARMA }), medicineExpiryController.getSummary.bind(medicineExpiryController));

export default router;
