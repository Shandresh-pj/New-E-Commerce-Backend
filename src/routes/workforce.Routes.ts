import { Router } from "express";
import { WorkforceDashboardController } from "../controllers/workforce-dashboard.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const ctrl = new WorkforceDashboardController();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];
const allRoles   = [...adminRoles, UserType.EMPLOYEE, UserType.SHOPKEEPER, UserType.DELIVERY_BOY];

/**
 * @swagger
 * tags:
 *   name: WorkforceDashboard
 *   description: Workforce live dashboard metrics, notifications and employee reports API
 */

/**
 * @swagger
 * /workforce/live:
 *   get:
 *     summary: Live Workforce Metrics
 *     description: Retrieve real-time attendance counts for today. (Admin only)
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Live metrics retrieved successfully
 */
router.get("/workforce/live",                        authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.live.bind(ctrl));

/**
 * @swagger
 * /workforce/live/details:
 *   get:
 *     summary: Live Workforce Detail List
 *     description: Retrieve today's attendance logs with full employee detail summaries. (Admin only)
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed live list retrieved
 */
router.get("/workforce/live/details",                authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.liveDetails.bind(ctrl));

/**
 * @swagger
 * /workforce/report/daily:
 *   get:
 *     summary: Detailed Daily Report
 *     description: Generates a complete daily attendance overview with aggregate statistics. (Admin only)
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Format DD:MM:YYYY
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daily report generated
 */
router.get("/workforce/report/daily",                authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.dailyReport.bind(ctrl));

/**
 * @swagger
 * /workforce/report/monthly:
 *   get:
 *     summary: Grouped Monthly Report
 *     description: Generates monthly report grouping work minutes and status counters per employee. (Admin only)
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: Month number (e.g. "07")
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year number (e.g. 2026)
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Monthly grouped report retrieved
 */
router.get("/workforce/report/monthly",              authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.monthlyReport.bind(ctrl));

/**
 * @swagger
 * /workforce/report/employee/{employeeId}:
 *   get:
 *     summary: Employee Monthly Attendance Log
 *     description: Generates specific monthly details for a single employee.
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee report generated
 */
router.get("/workforce/report/employee/:employeeId", authenticateMiddleware, authorize({ roles: allRoles }),   ctrl.employeeReport.bind(ctrl));

/**
 * @swagger
 * /workforce/notifications:
 *   get:
 *     summary: List Attendance Alerts
 *     description: Get paginated alerts for late arrivals, excess breaks, and biometric malfunctions. (Admin only)
 *     tags: [WorkforceDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: boolean
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
 *         description: Alerts list retrieved
 */
router.get("/workforce/notifications",               authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.notifications.bind(ctrl));

/**
 * @swagger
 * /workforce/notifications/{id}/read:
 *   post:
 *     summary: Mark Alert Read
 *     description: Marks a notification alert as read.
 *     tags: [WorkforceDashboard]
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
 *         description: Notification marked read successfully
 */
router.post("/workforce/notifications/:id/read",     authenticateMiddleware, authorize({ roles: allRoles }),   ctrl.markRead.bind(ctrl));

export default router;
