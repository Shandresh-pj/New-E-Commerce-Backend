import { Router } from "express";
import { ShiftController } from "../controllers/shift.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const ctrl = new ShiftController();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];
const allRoles   = [...adminRoles, UserType.EMPLOYEE, UserType.SHOPKEEPER, UserType.DELIVERY_BOY];

/**
 * @swagger
 * tags:
 *   name: Shift
 *   description: Shift management and shift assignments API
 */

/**
 * @swagger
 * /shifts:
 *   post:
 *     summary: Create Shift
 *     description: Creates a new shift pattern (Fixed, Flexible, Rotational, Overnight) with custom thresholds. (Admin only)
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - start_time
 *               - end_time
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [FIXED, FLEXIBLE, ROTATIONAL, OVERNIGHT]
 *               start_time:
 *                 type: string
 *                 description: Start time format HH:mm
 *               end_time:
 *                 type: string
 *                 description: End time format HH:mm
 *               grace_period_minutes:
 *                 type: integer
 *               min_work_minutes:
 *                 type: integer
 *               overtime_threshold_minutes:
 *                 type: integer
 *               late_threshold_minutes:
 *                 type: integer
 *               half_day_threshold_minutes:
 *                 type: integer
 *               allowed_break_minutes:
 *                 type: integer
 *               weekend_days:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Shift created successfully
 */
router.post("/shifts",                    authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.create.bind(ctrl));

/**
 * @swagger
 * /shifts/assignments/all:
 *   get:
 *     summary: Get All Shift Assignments
 *     description: Returns a list of all employee shift assignments. (Admin only)
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shift assignments list retrieved
 */
router.get("/shifts/assignments/all",     authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.assignments.bind(ctrl));

/**
 * @swagger
 * /shifts/employee/{employeeId}:
 *   get:
 *     summary: Get Employee Shift Assignment
 *     description: Returns the active shift assignment for a specific employee.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee shift details retrieved
 */
router.get("/shifts/employee/:employeeId",authenticateMiddleware, authorize({ roles: allRoles }),   ctrl.employeeShift.bind(ctrl));

/**
 * @swagger
 * /shifts/assign:
 *   post:
 *     summary: Assign Shift to Employees
 *     description: Bulk assigns or changes employee shift assignments. Deactivates previous active assignments. (Admin only)
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_ids
 *               - shift_id
 *               - effective_from
 *             properties:
 *               employee_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               shift_id:
 *                 type: integer
 *               effective_from:
 *                 type: string
 *                 description: Date format DD:MM:YYYY
 *               effective_to:
 *                 type: string
 *                 description: Date format DD:MM:YYYY (optional)
 *     responses:
 *       201:
 *         description: Shift assigned successfully
 */
router.post("/shifts/assign",             authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.assign.bind(ctrl));

/**
 * @swagger
 * /shifts/{id}:
 *   get:
 *     summary: Get Shift Details
 *     description: Retrieve single shift details.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Shift details retrieved
 */
router.get("/shifts/:id",                 authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getOne.bind(ctrl));

/**
 * @swagger
 * /shifts:
 *   get:
 *     summary: List Shifts
 *     description: Retrieve all configured shifts.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shifts retrieved successfully
 */
router.get("/shifts",                     authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getAll.bind(ctrl));

/**
 * @swagger
 * /shifts/{id}:
 *   put:
 *     summary: Update Shift Configuration
 *     description: Update specific parameters of a shift.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               grace_period_minutes:
 *                 type: integer
 *               min_work_minutes:
 *                 type: integer
 *               overtime_threshold_minutes:
 *                 type: integer
 *               late_threshold_minutes:
 *                 type: integer
 *               half_day_threshold_minutes:
 *                 type: integer
 *               allowed_break_minutes:
 *                 type: integer
 *               weekend_days:
 *                 type: array
 *                 items:
 *                   type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Shift updated
 */
router.put("/shifts/:id",                 authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.update.bind(ctrl));

/**
 * @swagger
 * /shifts/{id}:
 *   delete:
 *     summary: Delete Shift
 *     description: Remove a shift template.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Shift deleted
 */
router.delete("/shifts/:id",              authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.delete.bind(ctrl));

export default router;
