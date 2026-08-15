import { Router } from "express";
import { stockController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Stock
 *   description: Product inventory levels, real-time stock movements, and low-stock alerts
 */

/**
 * @swagger
 * /stock:
 *   get:
 *     summary: Get Stock Inventory Overview
 *     description: Retrieve inventory levels and stock reorder alerts for all products.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 45
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       product_id:
 *                         type: integer
 *                         example: 101
 *                       name:
 *                         type: string
 *                         example: "Smart TV 55 Inch"
 *                       sku:
 *                         type: string
 *                         example: "TV-55-4K"
 *                       stock:
 *                         type: integer
 *                         example: 15
 *                       reorder_level:
 *                         type: integer
 *                         example: 10
 *                       is_low_stock:
 *                         type: boolean
 *                         example: false
 *                       status:
 *                         type: string
 *                         example: "ACTIVE"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/stock",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.EMPLOYEE],
  }),
  stockController.getStockSummary.bind(stockController)
);

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
 *                 description: "**REQUIRED** Product ID"
 *               quantity:
 *                 type: integer
 *                 example: 25
 *                 description: "**REQUIRED** Quantity to add or remove"
 *               type:
 *                 type: string
 *                 enum: [ADDITION, DEDUCTION, AUDIT_ADJUSTMENT, RETURN]
 *                 example: "ADDITION"
 *                 description: "**REQUIRED** Stock transaction type"
 *               reason:
 *                 type: string
 *                 example: "New shipment arrived from supplier"
 *     responses:
 *       200:
 *         description: Stock updated successfully
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
 *                   example: "Stock updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing required fields or insufficient stock
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         description: Stock logs list retrieved successfully
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
 *                       product_id:
 *                         type: integer
 *                         example: 101
 *                       change_quantity:
 *                         type: integer
 *                         example: 25
 *                       type:
 *                         type: string
 *                         example: "ADDITION"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-14T10:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         example: 1
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
 *         description: Stock log approved successfully
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
 *                   example: "Stock log approved"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stock log not found
 *       500:
 *         description: Internal server error
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
