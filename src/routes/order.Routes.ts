/**
 * ===============================
 * ORDER ROUTES + SWAGGER
 * ===============================
 */

import { Router } from "express";
import { authorize } from "../middleware/authorize";
import { orderController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create New Order
 *     description: Creates a new customer or POS order with real-time stock allocation and sequential invoice generation.
 *     tags: [Orders]
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
 *             properties:
 *               company_id:
 *                 type: integer
 *                 example: 1
 *                 description: Target company ID (Optional)
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *                 description: Fulfillment branch ID (Optional)
 *               requested_invoice_no:
 *                 type: string
 *                 example: "INV-2026-0891"
 *                 description: Custom requested invoice number (Optional)
 *               payment:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [CASH, CARD, UPI, RAZORPAY, NETBANKING]
 *                     example: "UPI"
 *                   status:
 *                     type: string
 *                     enum: [PENDING, PAID, FAILED]
 *                     example: "PAID"
 *                   transaction_id:
 *                     type: string
 *                     example: "pay_N8x2yZ99"
 *               items:
 *                 type: array
 *                 description: List of line items (Required)
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                     - price
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 101
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 1299.00
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Insufficient stock or invalid payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/orders/create",
  authenticateMiddleware,
  authorize(),
  orderController.create.bind(orderController)
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     description: Returns all orders available for the authenticated tenant.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order list retrieved successfully
 */
router.get(
  "/orders",
  authenticateMiddleware,
  authorize(),
  orderController.getAll.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Returns a specific order with items.
 *     tags: [Orders]
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
 *         description: Order found
 *       404:
 *         description: Order not found
 */
router.get(
  "/orders/:id",
  authenticateMiddleware,
  authorize(),
  orderController.getById.bind(orderController)
);

/**
 * @swagger
 * /orders/suggestions/{companyId}:
 *   get:
 *     summary: Get Available Invoice Suggestions
 *     description: Returns available invoice prefix and numbering suggestions for a company.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Suggestions loaded successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to load suggestions
 */
router.get(
  "/orders/suggestions/:companyId",
  authenticateMiddleware,
  authorize(),
  orderController.getSuggestions.bind(orderController)
);

/**
 * @swagger
 * /orders/verify/{id}:
 *   get:
 *     summary: Verify Invoice QR Code
 *     description: Scan QR code to verify and retrieve order invoice details.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       404:
 *         description: Invalid invoice or order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/orders/verify/:id",
  orderController.verify.bind(orderController)
);

/**
 * @swagger
 * /orders/invoice-pdf/{id}:
 *   get:
 *     summary: Generate Invoice PDF
 *     description: Generate and stream invoice PDF as binary blob.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *           enum: [aurora, corporate, obsidian, green, classic, premium]
 *         description: PDF design theme
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *       - in: query
 *         name: gst
 *         schema:
 *           type: string
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: taxRate
 *         schema:
 *           type: number
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *       - in: query
 *         name: notes
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Failed to generate PDF
 */
router.get(
  "/orders/invoice-pdf/:id",
  authenticateMiddleware,
  authorize(),
  orderController.getInvoicePdf.bind(orderController)
);

/**
 * @swagger
 * /orders/invoice/{id}:
 *   get:
 *     summary: Download Order Invoice PDF
 *     description: Download generated PDF invoice for an order.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Invoice PDF stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/orders/invoice/:id",
  authenticateMiddleware,
  authorize(),
  orderController.getInvoicePdf.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update Order Status
 *     description: Update order fulfillment and payment status with real-time WebSocket notifications.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *                 example: "CONFIRMED"
 *               payment_status:
 *                 type: string
 *                 enum: [PENDING, PAID, FAILED, REFUNDED]
 *                 example: "PAID"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/orders/:id/status",
  authenticateMiddleware,
  authorize(),
  orderController.updateStatus.bind(orderController)
);
router.patch(
  "/orders/:id/status",
  authenticateMiddleware,
  authorize(),
  orderController.updateStatus.bind(orderController)
);
router.put(
  "/orders/:id",
  authenticateMiddleware,
  authorize(),
  orderController.updateStatus.bind(orderController)
);
router.post(
  "/orders/:id/status",
  authenticateMiddleware,
  authorize(),
  orderController.updateStatus.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Cancel / Delete Order
 *     description: Cancel an order and restore allocated inventory stock.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted and stock restored
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/orders/:id",
  authenticateMiddleware,
  authorize(),
  orderController.delete.bind(orderController)
);

export default router;