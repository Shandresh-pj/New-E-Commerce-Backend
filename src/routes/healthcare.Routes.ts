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

// ═══════════════════════════════════════════════════════════════════════════════
// DOCTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Doctors
 *   description: Doctor management endpoints
 */

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: List all doctors
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: {type: string}
 *       - in: query
 *         name: is_active
 *         schema: {type: boolean}
 *       - in: query
 *         name: page
 *         schema: {type: integer, default: 1}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, default: 20}
 *     responses:
 *       200:
 *         description: Doctors list
 */
router.get("/doctors",     authenticateMiddleware, authorize({ roles: HC_ALL }),   doctorController.getAll.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: integer}
 *     responses:
 *       200: {description: Doctor found}
 *       404: {description: Not found}
 */
router.get("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ALL }),   doctorController.getById.bind(doctorController));

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Create a new doctor
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:         {type: string}
 *               specialization: {type: string}
 *               license_no:   {type: string}
 *               phone:        {type: string}
 *               email:        {type: string}
 *               qualification:{type: string}
 *               experience_years: {type: integer}
 *               bio:          {type: string}
 *     responses:
 *       201: {description: Doctor created}
 */
router.post("/doctors",    authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.create.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   put:
 *     summary: Update a doctor
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: integer}
 *     responses:
 *       200: {description: Doctor updated}
 */
router.put("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.update.bind(doctorController));

/**
 * @swagger
 * /doctors/{id}:
 *   delete:
 *     summary: Deactivate a doctor
 *     tags: [Healthcare - Doctors]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: integer}
 *     responses:
 *       200: {description: Doctor deactivated}
 */
router.delete("/doctors/:id", authenticateMiddleware, authorize({ roles: HC_ADMIN }), doctorController.delete.bind(doctorController));

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Patients
 *   description: Patient management endpoints
 */

router.get("/patients",              authenticateMiddleware, authorize({ roles: HC_ALL }),    patientController.getAll.bind(patientController));
router.get("/patients/:id",          authenticateMiddleware, authorize({ roles: HC_ALL }),    patientController.getById.bind(patientController));
router.get("/patients/:id/history",  authenticateMiddleware, authorize({ roles: HC_ALL }),    patientController.getHistory.bind(patientController));
router.post("/patients",             authenticateMiddleware, authorize({ roles: HC_ALL }),    patientController.create.bind(patientController));
router.put("/patients/:id",          authenticateMiddleware, authorize({ roles: HC_ALL }),    patientController.update.bind(patientController));

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Appointments
 *   description: Appointment scheduling and status management
 */

router.get("/appointments",                 authenticateMiddleware, authorize({ roles: HC_ALL }),        appointmentController.getAll.bind(appointmentController));
router.get("/appointments/:id",             authenticateMiddleware, authorize({ roles: HC_ALL }),        appointmentController.getById.bind(appointmentController));
router.post("/appointments",                authenticateMiddleware, authorize({ roles: HC_ALL }),        appointmentController.create.bind(appointmentController));
router.put("/appointments/:id",             authenticateMiddleware, authorize({ roles: HC_ALL }),        appointmentController.update.bind(appointmentController));
router.patch("/appointments/:id/status",    authenticateMiddleware, authorize({ roles: HC_ALL }),        appointmentController.updateStatus.bind(appointmentController));
router.delete("/appointments/:id",          authenticateMiddleware, authorize({ roles: HC_ADMIN }),      appointmentController.cancel.bind(appointmentController));

// ═══════════════════════════════════════════════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Consultations
 *   description: Doctor consultation records
 */

router.get("/consultations",                authenticateMiddleware, authorize({ roles: HC_ALL }),         consultationController.getAll.bind(consultationController));
router.get("/consultations/:id",            authenticateMiddleware, authorize({ roles: HC_ALL }),         consultationController.getById.bind(consultationController));
router.post("/consultations",               authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   consultationController.create.bind(consultationController));
router.put("/consultations/:id",            authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   consultationController.update.bind(consultationController));
router.post("/consultations/:id/complete",  authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   consultationController.complete.bind(consultationController));

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Prescriptions
 *   description: Doctor prescriptions with medication timing
 */

router.get("/prescriptions",                authenticateMiddleware, authorize({ roles: HC_ALL }),         prescriptionController.getAll.bind(prescriptionController));
router.get("/prescriptions/:id",            authenticateMiddleware, authorize({ roles: HC_ALL }),         prescriptionController.getById.bind(prescriptionController));
router.post("/prescriptions",               authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   prescriptionController.create.bind(prescriptionController));
router.put("/prescriptions/:id",            authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   prescriptionController.update.bind(prescriptionController));
router.post("/prescriptions/:id/finalize",  authenticateMiddleware, authorize({ roles: DOCTOR_ROLES }),   prescriptionController.finalize.bind(prescriptionController));

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Medicines
 *   description: Medicine master catalog
 */

router.get("/medicines/search",    authenticateMiddleware, authorize({ roles: HC_ALL }),   medicineController.search.bind(medicineController));
router.get("/medicines/expiring",  authenticateMiddleware, authorize({ roles: PHARMA }),   medicineController.getExpiring.bind(medicineController));
router.get("/medicines",           authenticateMiddleware, authorize({ roles: HC_ALL }),   medicineController.getAll.bind(medicineController));
router.get("/medicines/:id",       authenticateMiddleware, authorize({ roles: HC_ALL }),   medicineController.getById.bind(medicineController));
router.post("/medicines",          authenticateMiddleware, authorize({ roles: PHARMA }),   medicineController.create.bind(medicineController));
router.put("/medicines/:id",       authenticateMiddleware, authorize({ roles: PHARMA }),   medicineController.update.bind(medicineController));
router.delete("/medicines/:id",    authenticateMiddleware, authorize({ roles: HC_ADMIN }), medicineController.delete.bind(medicineController));

// ═══════════════════════════════════════════════════════════════════════════════
// PHARMACY POS — Sales
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Pharmacy POS
 *   description: Pharmacy point-of-sale — atomic medicine sales with stock deduction
 */

router.get("/pharmacy-pos/sales",              authenticateMiddleware, authorize({ roles: PHARMA }),   pharmacyPosController.getAll.bind(pharmacyPosController));
router.get("/pharmacy-pos/sales/:id",          authenticateMiddleware, authorize({ roles: PHARMA }),   pharmacyPosController.getById.bind(pharmacyPosController));
router.post("/pharmacy-pos/sales",             authenticateMiddleware, authorize({ roles: PHARMA }),   pharmacyPosController.create.bind(pharmacyPosController));
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

router.get("/stock-approvals",                authenticateMiddleware, authorize({ roles: HC_ALL }),     stockApprovalHcController.getAll.bind(stockApprovalHcController));
router.get("/stock-approvals/:id",            authenticateMiddleware, authorize({ roles: HC_ALL }),     stockApprovalHcController.getById.bind(stockApprovalHcController));
router.post("/stock-approvals",               authenticateMiddleware, authorize({ roles: PHARMA }),     stockApprovalHcController.create.bind(stockApprovalHcController));
router.put("/stock-approvals/:id",            authenticateMiddleware, authorize({ roles: PHARMA }),     stockApprovalHcController.update.bind(stockApprovalHcController));
router.post("/stock-approvals/:id/approve",   authenticateMiddleware, authorize({ roles: HC_ADMIN }),   stockApprovalHcController.approve.bind(stockApprovalHcController));
router.post("/stock-approvals/:id/reject",    authenticateMiddleware, authorize({ roles: HC_ADMIN }),   stockApprovalHcController.reject.bind(stockApprovalHcController));

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINE EXPIRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Healthcare - Medicine Expiry
 *   description: Expiry tracking — EXPIRING_SOON, CRITICAL, EXPIRED
 */

router.get("/medicine-expiry",         authenticateMiddleware, authorize({ roles: PHARMA }), medicineExpiryController.getAll.bind(medicineExpiryController));
router.get("/medicine-expiry/summary", authenticateMiddleware, authorize({ roles: PHARMA }), medicineExpiryController.getSummary.bind(medicineExpiryController));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY ALIASES — match existing frontend API call patterns
// ═══════════════════════════════════════════════════════════════════════════════

// Pharmacy POS: frontend calls POST /pharmacy/sale
router.post("/pharmacy/sale", authenticateMiddleware, authorize({ roles: PHARMA }), pharmacyPosController.create.bind(pharmacyPosController));

// Stock approvals: frontend calls PATCH (backend registers both POST and PATCH)
router.patch("/stock-approvals/:id/approve", authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.approve.bind(stockApprovalHcController));
router.patch("/stock-approvals/:id/reject",  authenticateMiddleware, authorize({ roles: HC_ADMIN }), stockApprovalHcController.reject.bind(stockApprovalHcController));

// Medicines batch endpoint: frontend calls /medicines/:id/batches
// Maps single-stock medicine to a batch-compatible response
router.get("/medicines/:id/batches", authenticateMiddleware, authorize({ roles: HC_ALL }), async (req: any, res: any) => {
  try {
    const repo = require("../config/database").default.getRepository(
      require("../entities/healthcare2.entity").Medicine
    );
    const med = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!med) return res.status(404).json({ success: false, message: "Medicine not found" });

    // Return medicine as a single batch for frontend compatibility
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

export default router;
