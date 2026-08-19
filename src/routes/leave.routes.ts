import { Router } from "express";
import { leaveController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

const allRoles = [
  UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE
];

/**
 * @swagger
 * /leave/apply:
 *   post:
 *     summary: Apply for Employee Leave
 *     description: Submit a new leave application with leave type, date range, and reason.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leave_type
 *               - from_date
 *               - to_date
 *               - reason
 *             properties:
 *               employee_id:
 *                 type: integer
 *                 example: 5
 *                 description: Employee ID (auto-filled from session if omitted)
 *               company_id:
 *                 type: integer
 *                 example: 1
 *                 description: Company ID (auto-filled from session if omitted)
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *                 description: Branch ID (auto-filled from session if omitted)
 *               leave_type:
 *                 type: string
 *                 enum: [CASUAL, SICK, EMERGENCY, EARNED]
 *                 example: CASUAL
 *                 description: Type of leave requested (Required)
 *               from_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *                 description: Leave start date (YYYY-MM-DD) (Required)
 *               to_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-17"
 *                 description: Leave end date (YYYY-MM-DD) (Required)
 *               total_days:
 *                 type: integer
 *                 example: 3
 *                 description: Total number of leave days
 *               reason:
 *                 type: string
 *                 example: "Attending family function"
 *                 description: Explanation for leave (Required)
 *     responses:
 *       200:
 *         description: Leave application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input payload
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/leave/apply",
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  auditMiddleware("LEAVE_APPLY"),
  leaveController.apply.bind(leaveController)
);

/**
 * @swagger
 * /leave/balance:
 *   get:
 *     summary: Get Leave Balances for Employee
 *     description: Retrieve total, used, and remaining leave quotas by employee ID or logged-in user.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Target employee ID (Admin / Manager only) (Optional)
 *     responses:
 *       200:
 *         description: Leave balance data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  ["/leave/balance", "/leave/balance/:id"],
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getBalance.bind(leaveController)
);

/**
 * @swagger
 * /leave/history:
 *   get:
 *     summary: Get Leave History
 *     description: Retrieve historic leave applications filtered by date range and status.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter applications from date (YYYY-MM-DD) (Optional)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter applications to date (YYYY-MM-DD) (Optional)
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *         description: Leave status filter (Optional)
 *     responses:
 *       200:
 *         description: Leave history list retrieved
 */
router.get(
  ["/leave/history", "/leave/history/:id"],
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getHistory.bind(leaveController)
);

/**
 * @swagger
 * /leave:
 *   get:
 *     summary: List All Leave Requests (Management)
 *     description: Fetch leave applications across branch or organization with pagination.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (Optional)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (Optional)
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by approval status (Optional)
 *     responses:
 *       200:
 *         description: List of leave requests
 */
router.get(
  "/leave",
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getAll.bind(leaveController)
);

/**
 * @swagger
 * /leave/approve/{id}:
 *   put:
 *     summary: Approve Leave Application
 *     description: Approve a pending leave request by ID.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave Application ID (Required)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Approved after team cover confirmed"
 *                 description: Manager approval notes (Optional)
 *     responses:
 *       200:
 *         description: Leave application approved
 *       404:
 *         description: Leave request not found
 */
router.put(
  "/leave/approve/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
    requireApproval: true,
  }),
  auditMiddleware("LEAVE_APPROVE"),
  leaveController.approve.bind(leaveController)
);

/**
 * @swagger
 * /leave/reject/{id}:
 *   put:
 *     summary: Reject Leave Application
 *     description: Reject a leave application with mandatory rejection notes.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave Application ID (Required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Critical project deadline on requested dates"
 *                 description: Rejection reason (Required)
 *     responses:
 *       200:
 *         description: Leave application rejected
 *       400:
 *         description: Rejection reason is required
 */
router.put(
  "/leave/reject/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
    requireApproval: true,
  }),
  auditMiddleware("LEAVE_REJECT"),
  leaveController.reject.bind(leaveController)
);

/**
 * @swagger
 * /leave/{id}:
 *   delete:
 *     summary: Cancel or Delete Leave Application
 *     description: Delete a pending leave application.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave Application ID (Required)
 *     responses:
 *       200:
 *         description: Leave application deleted
 *       404:
 *         description: Leave application not found
 */
router.delete(
  "/leave/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("LEAVE_DELETE"),
  leaveController.delete.bind(leaveController)
);

/**
 * @swagger
 * /leave/update/{id}:
 *   put:
 *     summary: Update Leave Application Details
 *     description: Update an existing leave request by ID.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leave_type:
 *                 type: string
 *                 enum: [CASUAL, SICK, EMERGENCY, EARNED]
 *               from_date:
 *                 type: string
 *                 format: date
 *               to_date:
 *                 type: string
 *                 format: date
 *               total_days:
 *                 type: integer
 *               reason:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Leave request updated successfully
 *       404:
 *         description: Leave request not found
 */
router.put(
  ["/leave/update/:id", "/leave/:id"],
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  auditMiddleware("LEAVE_UPDATE"),
  leaveController.update.bind(leaveController)
);

/**
 * @swagger
 * /leave/{id}:
 *   get:
 *     summary: Get Leave Request details by ID
 *     description: Retrieve single leave application details by ID.
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave Application ID
 *     responses:
 *       200:
 *         description: Leave application details
 *       404:
 *         description: Leave application not found
 */
router.get(
  "/leave/:id",
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getById.bind(leaveController)
);

export default router;

