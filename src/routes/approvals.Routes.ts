import { Router } from "express";
import { approvalsController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /approvals:
 *   get:
 *     summary: List Approval Requests
 *     description: Retrieve all pending, approved, or rejected product & system approval requests.
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by request status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of approval requests retrieved
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/approvals",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.EMPLOYEE,
    ],
  }),
  approvalsController.getAll.bind(approvalsController)
);

/**
 * @swagger
 * /approvals/{id}:
 *   get:
 *     summary: Get Approval Request Details
 *     description: Fetch detailed information for a specific approval request by ID.
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Approval Request ID
 *     responses:
 *       200:
 *         description: Approval request details retrieved
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/approvals/:id",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.EMPLOYEE,
    ],
  }),
  approvalsController.getById.bind(approvalsController)
);

/**
 * @swagger
 * /approvals/{id}/action:
 *   post:
 *     summary: Take Action on Approval Request
 *     description: Approve or reject a specific approval request.
 *     tags: [Approvals]
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
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               reason:
 *                 type: string
 *                 example: "Approved by manager"
 *     responses:
 *       200:
 *         description: Action recorded successfully
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/approvals/:id/action",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
    ],
  }),
  auditMiddleware("PRODUCT_APPROVAL"),
  approvalsController.takeAction.bind(approvalsController)
);

/**
 * @swagger
 * /approvals/bulk-action:
 *   post:
 *     summary: Bulk Approve/Reject Requests
 *     description: Process multiple approval requests simultaneously.
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *               - action
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk action completed
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/approvals/bulk-action",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PRODUCT_APPROVAL"),
  approvalsController.bulkAction.bind(approvalsController)
);

export default router;
