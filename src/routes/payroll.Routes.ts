import { Router } from "express";
import { payrollController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /payroll/generate:
 *   post:
 *     summary: Generate Payroll
 *     description: >
 *       Auto-calculates gross salary, deductions, and net salary for one or all employees
 *       for a given month/year based on attendance, leaves, and shift records.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *                 example: 8
 *                 description: Month number (1-12)
 *               year:
 *                 type: integer
 *                 example: 2026
 *                 description: Year (e.g. 2026)
 *               employee_id:
 *                 type: integer
 *                 example: 10
 *                 description: Specific employee ID (optional)
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *                 description: Specific branch ID (optional)
 *     responses:
 *       200:
 *         description: Payroll generated successfully
 *       400:
 *         description: Payroll already generated for this period
 *       403:
 *         description: Forbidden — Admin role required
 */
router.post(
  "/payroll/generate",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("PAYROLL"),
  payrollController.generate.bind(payrollController)
);

/**
 * @swagger
 * /payroll:
 *   get:
 *     summary: Get Payroll List
 *     description: Retrieve all payroll records for the active company/branch with optional filters.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           example: 8
 *         description: Filter by month number (1–12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: Filter by year
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Filter by branch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, PAID]
 *         description: Filter by payroll status
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
 *         description: Payroll list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payroll'
 */
router.get(
  "/payroll",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.getAll.bind(payrollController)
);

/**
 * @swagger
 * /payroll/summary:
 *   get:
 *     summary: Get Payroll Summary
 *     description: >
 *       Returns aggregate payroll data — total gross, deductions, net salary,
 *       and count of records for the selected period.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           example: 2026
 *       - in: query
 *         name: branch_id
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Payroll summary data
 */
router.get(
  "/payroll/summary",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.summary.bind(payrollController)
);

/**
 * @swagger
 * /payroll/slip/{id}:
 *   get:
 *     summary: Get Payslip by Payroll ID
 *     description: >
 *       Retrieve a formatted payslip for a specific payroll record.
 *       Employees can only access their own payslip.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 501
 *         description: Payroll record ID
 *     responses:
 *       200:
 *         description: Payslip retrieved
 *       404:
 *         description: Payroll record not found
 */
router.get(
  "/payroll/slip/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.EMPLOYEE],
  }),
  payrollController.payslip.bind(payrollController)
);

/**
 * @swagger
 * /payroll/approve/{id}:
 *   post:
 *     summary: Approve Payroll
 *     description: Manager approves a pending payroll record. Changes status from PENDING → APPROVED.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 501
 *         description: Payroll ID to approve
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: Approved for August payroll
 *                 description: Optional approval remarks
 *     responses:
 *       200:
 *         description: Payroll approved
 *       400:
 *         description: Payroll not in PENDING status
 *       404:
 *         description: Payroll not found
 */
router.post(
  "/payroll/approve/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("PAYROLL_APPROVE"),
  payrollController.approve.bind(payrollController)
);

/**
 * @swagger
 * /payroll/mark-paid/{id}:
 *   post:
 *     summary: Mark Payroll as Paid
 *     description: >
 *       Records that the salary has been disbursed to the employee.
 *       Changes status from APPROVED → PAID.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 501
 *         description: Payroll ID to mark as paid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method:
 *                 type: string
 *                 enum: [BANK_TRANSFER, CASH, UPI]
 *                 example: BANK_TRANSFER
 *                 description: Optional disbursement method
 *               transaction_ref:
 *                 type: string
 *                 example: UTR2026081000123
 *                 description: Optional bank UTR / transaction reference
 *               paid_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-31"
 *                 description: Optional date of payment (defaults to today)
 *     responses:
 *       200:
 *         description: Payroll marked as paid
 *       400:
 *         description: Payroll not in APPROVED status
 *       404:
 *         description: Payroll not found
 */
router.post(
  "/payroll/mark-paid/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PAYROLL_PAID"),
  payrollController.markPaid.bind(payrollController)
);

/**
 * @swagger
 * /payroll/{id}:
 *   get:
 *     summary: Get Single Payroll Record
 *     description: Retrieve full details of a specific payroll entry including all earning and deduction breakdowns.
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 501
 *         description: Payroll record ID
 *     responses:
 *       200:
 *         description: Payroll details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Payroll'
 *       404:
 *         description: Payroll not found
 */
router.get(
  "/payroll/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.getOne.bind(payrollController)
);

export default router;
