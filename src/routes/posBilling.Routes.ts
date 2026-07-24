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
 *                 example: INV-POS-894210
 *               company_id:
 *                 type: integer
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *               customer_name:
 *                 type: string
 *                 example: Walk-in Customer
 *               customer_phone:
 *                 type: string
 *                 example: +91 9876543210
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                     product_name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *                     total_price:
 *                       type: number
 *               subtotal:
 *                 type: number
 *                 example: 765.00
 *               tax:
 *                 type: number
 *                 example: 137.70
 *               discount:
 *                 type: number
 *                 example: 0.00
 *               grand_total:
 *                 type: number
 *                 example: 902.70
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, SPLIT]
 *                 example: UPI
 *     responses:
 *       201:
 *         description: POS Order created & inventory stock updated
 *       400:
 *         description: Bad request
 */
router.post("/pos/checkout", authenticateMiddleware, posBillingController.createPosOrder.bind(posBillingController));

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
 *     responses:
 *       200:
 *         description: List of POS sales invoices
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
 *         description: List of POS active products
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
 *     responses:
 *       200:
 *         description: Branch POS financial summary
 */
router.get("/pos/analytics", authenticateMiddleware, posBillingController.getPosAnalytics.bind(posBillingController));

export default router;
