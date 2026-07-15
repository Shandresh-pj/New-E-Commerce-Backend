import { Router } from "express";
import { attendanceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const allRoles = [
  UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE,
];
const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management endpoints
 */

/**
 * @swagger
 * /attendance/check-in:
 *   post:
 *     summary: Employee Check In
 *     description: Records employee check-in with automatic shift detection and late arrival scoring.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employee_id:
 *                 type: integer
 *                 description: Specific employee ID (optional for self)
 *               source:
 *                 type: string
 *                 enum: [WEB, MOBILE, MANUAL, BIOMETRIC, RFID, QR]
 *                 default: WEB
 *               gps_lat:
 *                 type: number
 *               gps_lng:
 *                 type: number
 *               idempotency_key:
 *                 type: string
 *     responses:
 *       201:
 *         description: Check-in recorded successfully
 *       400:
 *         description: Bad request
 */
router.post("/attendance/check-in",         authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.checkIn.bind(attendanceController));

/**
 * @swagger
 * /attendance/check-out/{id}:
 *   post:
 *     summary: Employee Check Out
 *     description: Records check-out and automatically calculates working minutes, breaks, and overtime.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attendance record ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gps_lat:
 *                 type: number
 *               gps_lng:
 *                 type: number
 *     responses:
 *       200:
 *         description: Check-out recorded successfully
 */
router.post("/attendance/check-out/:id",    authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.checkOut.bind(attendanceController));

// Legacy aliases (backwards compat)
router.post("/attendance/checkin",          authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.checkIn.bind(attendanceController));
/**
 * @swagger
 * /attendance/checkout/{id}:
 *   post:
 *     summary: POST /attendance/checkout/:id
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/attendance/checkout/:id",     authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.checkOut.bind(attendanceController));

/**
 * @swagger
 * /attendance/break-in:
 *   post:
 *     summary: Start Break Session
 *     description: Starts a new break session. Only one break session can be active at a time.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - attendance_id
 *             properties:
 *               attendance_id:
 *                 type: integer
 *               break_type:
 *                 type: string
 *                 enum: [LUNCH, TEA, PERSONAL, FLEXIBLE]
 *                 default: PERSONAL
 *               break_policy_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Break started successfully
 */
router.post("/attendance/break-in",         authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.breakIn.bind(attendanceController));

/**
 * @swagger
 * /attendance/break-out/{breakLogId}:
 *   post:
 *     summary: End Break Session
 *     description: Ends an active break session and triggers deduction threshold validation logic.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: breakLogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Break log ID
 *     responses:
 *       200:
 *         description: Break ended successfully
 */
router.post("/attendance/break-out/:breakLogId", authenticateMiddleware, authorize({ roles: allRoles }), attendanceController.breakOut.bind(attendanceController));

/**
 * @swagger
 * /attendance/breaks/{id}:
 *   get:
 *     summary: Get break logs
 *     description: Retrieve all break logs for a specific attendance record.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attendance session ID
 *     responses:
 *       200:
 *         description: Break logs retrieved successfully
 */
router.get("/attendance/breaks/:attendanceId", authenticateMiddleware, authorize({ roles: allRoles }), attendanceController.getBreaks.bind(attendanceController));

/**
 * @swagger
 * /attendance/dashboard:
 *   get:
 *     summary: Live Attendance Dashboard
 *     description: Returns current metrics including total, checked-in, checked-out, on-break, late, and absent counts.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter metrics by branch
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved
 */
router.get("/attendance/dashboard",         authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.dashboard.bind(attendanceController));

/**
 * @swagger
 * /attendance/today:
 *   get:
 *     summary: Today's Status
 *     description: Gets today's attendance record and any active break for the logged-in employee.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter status by employee
 *     responses:
 *       200:
 *         description: Status retrieved
 */
router.get("/attendance/today",             authenticateMiddleware, authorize({ roles: allRoles }),   attendanceController.today.bind(attendanceController));

/**
 * @swagger
 * /attendance/report/daily:
 *   get:
 *     summary: Daily Attendance Report
 *     description: Full summary report of all employee records on a specific date.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date format DD:MM:YYYY
 *     responses:
 *       200:
 *         description: Daily report generated
 */
router.get("/attendance/report/daily",      authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.dailyReport.bind(attendanceController));

/**
 * @swagger
 * /attendance/report/monthly:
 *   get:
 *     summary: Monthly Attendance Report
 *     description: Grouped list of employee attendance records filtered by month and year.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Month number (e.g. "07")
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year number (e.g. 2026)
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter by specific employee
 *     responses:
 *       200:
 *         description: Monthly report generated
 */
router.get("/attendance/report/monthly",    authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.monthlyReport.bind(attendanceController));

/**
 * @swagger
 * /attendance/employee/{employeeId}:
 *   get:
 *     summary: Employee Attendance History
 *     description: Paginated attendance log for a specific employee.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: History retrieved
 */
router.get("/attendance/employee/:employeeId", authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.employeeHistory.bind(attendanceController));

/**
 * @swagger
 * /attendance/manual:
 *   post:
 *     summary: Create Manual Log
 *     description: Manually create an attendance record for an employee (Admin only).
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - attendance_date
 *               - check_in
 *             properties:
 *               employee_id:
 *                 type: integer
 *               attendance_date:
 *                 type: string
 *                 description: Format DD:MM:YYYY
 *               check_in:
 *                 type: string
 *                 description: Format HH:mm:ss
 *               check_out:
 *                 type: string
 *                 description: Format HH:mm:ss
 *               status:
 *                 type: string
 *               branch_id:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manual attendance created
 */
router.post("/attendance/manual",           authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.manual.bind(attendanceController));

/**
 * @swagger
 * /attendance/regularize/{id}:
 *   post:
 *     summary: Regularize Attendance Log
 *     description: Regularize check-in/out times or status of an existing record (Admin only).
 *     tags: [Attendance]
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
 *               status:
 *                 type: string
 *               check_in:
 *                 type: string
 *               check_out:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance regularized
 */
router.post("/attendance/regularize/:id",   authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.regularize.bind(attendanceController));

/**
 * @swagger
 * /attendance/approve/{id}:
 *   post:
 *     summary: Approve Attendance Log
 *     description: Approve an employee attendance log to lock it for payroll generation (Admin/Manager only).
 *     tags: [Attendance]
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
 *         description: Attendance approved successfully
 */
router.post("/attendance/approve/:id",      authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.approve.bind(attendanceController));

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get All Attendance
 *     description: Returns a paginated list of attendance records under current scoping.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List retrieved
 */
router.get("/attendance",                   authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.getAll.bind(attendanceController));

/**
 * @swagger
 * /attendance/{id}:
 *   get:
 *     summary: Get Attendance Detail
 *     tags: [Attendance]
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
 *         description: Record detail with break logs
 */
router.get("/attendance/:id",               authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.getOne.bind(attendanceController));

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     summary: Update Attendance Record
 *     tags: [Attendance]
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
 *               status:
 *                 type: string
 *               check_in:
 *                 type: string
 *               check_out:
 *                 type: string
 *               shift_id:
 *                 type: integer
 *               shift_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated successfully
 */
router.put("/attendance/:id",               authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.update.bind(attendanceController));

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     summary: Delete Attendance Record
 *     tags: [Attendance]
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
 *         description: Record deleted
 */
router.delete("/attendance/:id",            authenticateMiddleware, authorize({ roles: adminRoles }), attendanceController.delete.bind(attendanceController));

export default router;
