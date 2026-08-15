import { Router } from "express";
import { auditLogsController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: System security and operational audit logs
 */

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get Audit Logs
 *     description: Retrieve audit logs scoped by user company/branch context.
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       action:
 *                         type: string
 *                         example: "USER_LOGIN"
 *                       userId:
 *                         type: integer
 *                         example: 12
 *                       companyId:
 *                         type: integer
 *                         example: 1
 *                       branchId:
 *                         type: integer
 *                         nullable: true
 *                         example: 1
 *                       ipAddress:
 *                         type: string
 *                         example: "192.168.1.50"
 *                       userAgent:
 *                         type: string
 *                         example: "Mozilla/5.0..."
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-14T10:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/audit",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditLogsController.getLogs.bind(auditLogsController)
);

/**
 * @swagger
 * /audit/{id}:
 *   delete:
 *     summary: Delete Audit Log
 *     description: Delete a specific audit log record (Super Admin only).
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Audit log ID to delete
 *         example: 101
 *     responses:
 *       200:
 *         description: Audit log deleted successfully
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
 *                   example: "Audit log deleted"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Audit log not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/audit/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditLogsController.deleteLog.bind(auditLogsController)
);

export default router;
