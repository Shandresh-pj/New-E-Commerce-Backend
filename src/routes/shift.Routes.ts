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
 *                 example: "Morning General Shift"
 *                 description: "**REQUIRED** Shift template name"
 *               type:
 *                 type: string
 *                 enum: [FIXED, FLEXIBLE, ROTATIONAL, OVERNIGHT]
 *                 example: "FIXED"
 *                 description: "**REQUIRED** Shift scheduling type"
 *               start_time:
 *                 type: string
 *                 example: "09:00"
 *                 description: "**REQUIRED** Start time format HH:mm"
 *               end_time:
 *                 type: string
 *                 example: "18:00"
 *                 description: "**REQUIRED** End time format HH:mm"
 *               grace_period_minutes:
 *                 type: integer
 *                 example: 15
 *                 description: Grace period before marked as late
 *               min_work_minutes:
 *                 type: integer
 *                 example: 480
 *                 description: Minimum required work minutes for full day
 *               overtime_threshold_minutes:
 *                 type: integer
 *                 example: 60
 *               late_threshold_minutes:
 *                 type: integer
 *                 example: 30
 *               half_day_threshold_minutes:
 *                 type: integer
 *                 example: 240
 *               allowed_break_minutes:
 *                 type: integer
 *                 example: 60
 *               weekend_days:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [0, 6]
 *                 description: Array of weekend days (0 = Sunday, 6 = Saturday)
 *     responses:
 *       201:
 *         description: Shift created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shift created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Morning General Shift"
 *                     type:
 *                       type: string
 *                       example: "FIXED"
 *                     start_time:
 *                       type: string
 *                       example: "09:00"
 *                     end_time:
 *                       type: string
 *                       example: "18:00"
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/shifts", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.create.bind(ctrl));

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
 *         description: Shift assignments list retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       employee_id:
 *                         type: integer
 *                         example: 10
 *                       shift_id:
 *                         type: integer
 *                         example: 1
 *                       effective_from:
 *                         type: string
 *                         example: "01:08:2026"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/shifts/assignments/all", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.assignments.bind(ctrl));

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
 *         example: 10
 *     responses:
 *       200:
 *         description: Employee shift details retrieved successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     shift:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift assignment not found
 *       500:
 *         description: Internal server error
 */
router.get("/shifts/employee/:employeeId", authenticateMiddleware, authorize({ roles: allRoles }), ctrl.employeeShift.bind(ctrl));

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
 *                 example: [10, 11, 12]
 *                 description: "**REQUIRED** List of Employee User IDs"
 *               shift_id:
 *                 type: integer
 *                 example: 1
 *                 description: "**REQUIRED** Shift template ID"
 *               effective_from:
 *                 type: string
 *                 example: "01:08:2026"
 *                 description: "**REQUIRED** Effective start date format DD:MM:YYYY"
 *               effective_to:
 *                 type: string
 *                 example: "31:12:2026"
 *                 description: Optional expiry date format DD:MM:YYYY
 *     responses:
 *       201:
 *         description: Shift assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shift assigned to 3 employees"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required assignment parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/shifts/assign", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.assign.bind(ctrl));

/**
 * @swagger
 * /shifts/{id}:
 *   get:
 *     summary: Get Shift Details
 *     description: Retrieve single shift details by ID.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Shift details retrieved successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Morning General Shift"
 *                     start_time:
 *                       type: string
 *                       example: "09:00"
 *                     end_time:
 *                       type: string
 *                       example: "18:00"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.get("/shifts/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getOne.bind(ctrl));

/**
 * @swagger
 * /shifts:
 *   get:
 *     summary: List Shifts
 *     description: Retrieve all configured shifts for the authenticated company/branch.
 *     tags: [Shift]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shifts retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Morning General Shift"
 *                       type:
 *                         type: string
 *                         example: "FIXED"
 *                       start_time:
 *                         type: string
 *                         example: "09:00"
 *                       end_time:
 *                         type: string
 *                         example: "18:00"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/shifts", authenticateMiddleware, authorize({ roles: allRoles }), ctrl.getAll.bind(ctrl));

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
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Shift Name"
 *               type:
 *                 type: string
 *                 enum: [FIXED, FLEXIBLE, ROTATIONAL, OVERNIGHT]
 *                 example: "FLEXIBLE"
 *               start_time:
 *                 type: string
 *                 example: "10:00"
 *               end_time:
 *                 type: string
 *                 example: "19:00"
 *               grace_period_minutes:
 *                 type: integer
 *                 example: 20
 *               min_work_minutes:
 *                 type: integer
 *                 example: 480
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Shift updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shift updated"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.put("/shifts/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.update.bind(ctrl));

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
 *         example: 1
 *     responses:
 *       200:
 *         description: Shift deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shift deleted"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.delete("/shifts/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.delete.bind(ctrl));

export default router;
