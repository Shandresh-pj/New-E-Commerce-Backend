import { Router } from "express";
import { stockController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /stock/update:
 *   post:
 *     summary: Update Product Inventory Stock
 *     description: Add or deduct physical stock inventory quantity for a product or variant.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - type
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 101
 *                 description: Product ID (Required)
 *               quantity:
 *                 type: integer
 *                 example: 25
 *                 description: Quantity to add or remove (Required)
 *               type:
 *                 type: string
 *                 enum: [ADDITION, DEDUCTION, AUDIT_ADJUSTMENT, RETURN]
 *                 example: "ADDITION"
 *                 description: Stock transaction type (Required)
 *               reason:
 *                 type: string
 *                 example: "New shipment arrived from supplier"
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Missing required fields or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/stock/update",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("STOCK"),
  stockController.updateStock.bind(stockController)
);

/**
 * @swagger
 * /stock/logs:
 *   get:
 *     summary: Get Inventory Stock Logs
 *     description: Retrieve audit logs of all historical stock changes and adjustments.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter logs by product ID
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
 *         description: Stock logs list retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/stock/logs",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.EMPLOYEE],
  }),
  stockController.logs.bind(stockController)
);

/**
 * @swagger
 * /stock/logs/{id}/approve:
 *   put:
 *     summary: Approve Pending Stock Log Adjustment
 *     description: Approve a pending stock audit/adjustment log (Admin only).
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stock log ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 example: "Approved by warehouse manager"
 *     responses:
 *       200:
 *         description: Stock log approved
 *       404:
 *         description: Stock log not found
 */
router.put(
  "/stock/logs/:id/approve",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("STOCK_APPROVAL"),
  stockController.approveStock.bind(stockController)
);

export default router;
