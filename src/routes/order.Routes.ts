/**
 * ===============================
 * ORDER ROUTES + SWAGGER
 * ===============================
 */

import { Router } from "express";
// import { authenticateMiddleware } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { orderController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create Order
 *     description: Creates a new order with stock validation and safe invoice generation.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id:
 *                 type: integer
 *               requested_invoice_no:
 *                 type: string
 *               payment:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                   status:
 *                     type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *
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
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *
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
 * /orders/{id}:
 *   delete:
 *     summary: Delete order
 *     description: Deletes an order and restores product stock.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 */
router.delete(
  "/orders/:id",
  authenticateMiddleware,
  authorize(),
  orderController.delete.bind(orderController)
);


/**
 * @swagger
 * /orders/verify/{id}:
 *   get:
 *     summary: Verify Invoice QR
 *     description: Scan QR and retrieve invoice details.
 *     tags: [Orders, Invoices]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: Invoice verified
 *       404:
 *         description: Invalid invoice
 */
router.get(
  "/orders/verify/:id",
  authenticateMiddleware,
  authorize(),
  orderController.verify.bind(orderController)
);


/**
 * @swagger
 * /orders/suggestions/{companyId}:
 *   get:
 *     summary: Get invoice suggestions
 *     description: Returns guaranteed unique invoice numbers.
 *     tags: [Orders, Invoices]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: Suggestions loaded successfully
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
 * /orders/invoice-pdf/{id}:
 *   get:
 *     summary: Generate Invoice PDF
 *     description: Generate and stream invoice PDF as binary blob.
 *     tags: [Orders, Invoices]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *           enum:
 *             - aurora
 *             - corporate
 *             - obsidian
 *             - green
 *             - classic
 *             - premium
 *
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: gst
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: taxRate
 *         schema:
 *           type: number
 *
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: notes
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 *       404:
 *         description: Order not found
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
 *     summary: GET /orders/invoice/:id
 *     tags: [Order]
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
router.get(
  "/orders/invoice/:id",
  authenticateMiddleware,
  authorize(),
  orderController.getInvoicePdf.bind(orderController)
);

export default router;