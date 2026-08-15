/**
 * ============================================================================
 * POS BILLING MACHINE ROUTES + SWAGGER API DOCUMENTATION
 * ============================================================================
 */

import { Router } from "express";
import { posBillingController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: POS Billing Machine
 *   description: High-speed point-of-sale billing, barcode lookup, invoice generation, and inventory sync
 */

/**
 * @swagger
 * /pos/checkout:
 *   post:
 *     summary: POS Billing Checkout
 *     description: Process high-speed POS billing order, record sales invoice, calculate GST tax, and deduct product inventory stock.
 *     tags: [POS Billing Machine]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - grand_total
 *             properties:
 *               invoice_no:
 *                 type: string
 *                 example: "INV-POS-894210"
 *                 description: Unique POS invoice sequence number
 *               company_id:
 *                 type: integer
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *               customer_name:
 *                 type: string
 *                 example: "Walk-in Customer"
 *               customer_phone:
 *                 type: string
 *                 example: "+91 9876543210"
 *               items:
 *                 type: array
 *                 description: "**REQUIRED** Array of line items purchased"
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 12
 *                     product_name:
 *                       type: string
 *                       example: "HDMI Cable 2m"
 *                     quantity:
 *                       type: number
 *                       example: 2
 *                     unit_price:
 *                       type: number
 *                       example: 250.00
 *                     total_price:
 *                       type: number
 *                       example: 500.00
 *               subtotal:
 *                 type: number
 *                 example: 500.00
 *               tax:
 *                 type: number
 *                 example: 90.00
 *               discount:
 *                 type: number
 *                 example: 0.00
 *               grand_total:
 *                 type: number
 *                 example: 590.00
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, SPLIT]
 *                 example: "UPI"
 *     responses:
 *       201:
 *         description: POS Order created & inventory stock updated
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
 *                   example: "POS order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 104
 *                     invoice_no:
 *                       type: string
 *                       example: "INV-POS-894210"
 *                     grand_total:
 *                       type: number
 *                       example: 590.00
 *                     payment_method:
 *                       type: string
 *                       example: "UPI"
 *       400:
 *         description: Bad request - Missing items or stock error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/pos/checkout", authenticateMiddleware, posBillingController.createPosOrder.bind(posBillingController));
router.post("/pos-billing/create", authenticateMiddleware, posBillingController.createPosOrder.bind(posBillingController));

/**
 * @swagger
 * /pos/orders:
 *   get:
 *     summary: Fetch POS Order History
 *     description: Retrieve historical POS sales invoices for active company and branch.
 *     tags: [POS Billing Machine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter invoices by branch ID
 *         example: 1
 *     responses:
 *       200:
 *         description: List of POS sales invoices retrieved successfully
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
 *                         example: 104
 *                       invoice_no:
 *                         type: string
 *                         example: "INV-POS-894210"
 *                       customer_name:
 *                         type: string
 *                         example: "Walk-in Customer"
 *                       grand_total:
 *                         type: number
 *                         example: 590.00
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-14T15:20:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/pos/orders", authenticateMiddleware, posBillingController.getPosOrders.bind(posBillingController));

/**
 * @swagger
 * /pos/products:
 *   get:
 *     summary: Fetch POS Catalog Products
 *     description: Retrieve active catalog inventory items for barcode scanning and POS grid display.
 *     tags: [POS Billing Machine]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of POS active products retrieved successfully
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
 *                   example: 45
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 12
 *                       name:
 *                         type: string
 *                         example: "HDMI Cable 2m"
 *                       sku:
 *                         type: string
 *                         example: "HDMI-2M-001"
 *                       barcode:
 *                         type: string
 *                         example: "8901234567890"
 *                       retail_price:
 *                         type: number
 *                         example: 250.00
 *                       stock_quantity:
 *                         type: integer
 *                         example: 100
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/pos/products", authenticateMiddleware, posBillingController.getPosProducts.bind(posBillingController));

/**
 * @swagger
 * /pos/analytics:
 *   get:
 *     summary: Fetch POS Profit & Loss Analytics
 *     description: Retrieve branch sales revenue, GST tax, order count, and average order value metrics.
 *     tags: [POS Billing Machine]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Branch POS financial summary retrieved successfully
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
 *                     total_revenue:
 *                       type: number
 *                       example: 154200.00
 *                     total_tax:
 *                       type: number
 *                       example: 27756.00
 *                     total_orders:
 *                       type: integer
 *                       example: 230
 *                     avg_order_value:
 *                       type: number
 *                       example: 670.43
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/pos/analytics", authenticateMiddleware, posBillingController.getPosAnalytics.bind(posBillingController));

export default router;
