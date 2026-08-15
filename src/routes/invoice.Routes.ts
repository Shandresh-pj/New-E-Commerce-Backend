import { Router } from "express";
import { invoiceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const allowedRoles = [
  UserType.SUPER_ADMIN,
  UserType.ADMIN,
  UserType.BRANCH,
  UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER,
  UserType.CUSTOMER,
  UserType.EMPLOYEE
];

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List All Invoices
 *     description: Retrieve list of invoices filtered by company and optional status.
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of invoices retrieved
 */
router.get(
  "/invoices",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.getAll.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get Invoice by ID
 *     description: Retrieve specific invoice record.
 *     tags: [Invoice]
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
 *         description: Invoice details
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/invoices/:id",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.getById.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/suggestions:
 *   get:
 *     summary: Get Next Invoice Number Suggestions
 *     description: Retrieve auto-incremented guaranteed unique invoice number for current company/branch context.
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Company ID (Optional)
 *     responses:
 *       200:
 *         description: Next available invoice number suggestions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get(
  "/invoices/suggestions",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.getSuggestions.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/create:
 *   post:
 *     summary: Generate Sales Invoice
 *     description: Create a formatted sales invoice record with GST tax calculations and billing info.
 *     tags: [Invoice]
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
 *               - totalAmount
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "ord_5501"
 *                 description: Associated Order ID (Optional)
 *               customerName:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Customer full name (Optional)
 *               customerPhone:
 *                 type: string
 *                 example: "+919876543210"
 *                 description: Customer contact phone (Optional)
 *               totalAmount:
 *                 type: number
 *                 example: 1499.00
 *                 description: Total invoice amount (Required)
 *               items:
 *                 type: array
 *                 description: List of invoiced line items (Required)
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                     - quantity
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "HD Set Top Box"
 *                     price:
 *                       type: number
 *                       example: 1499.00
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Missing required fields
 */
router.post(
  "/invoices/create",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.create.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/print:
 *   post:
 *     summary: Print Invoice Payload
 *     description: Format invoice data for thermal printer (80mm) or standard A4 receipt printer.
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "inv_1001"
 *                 description: Target Invoice ID (Required)
 *               paperSize:
 *                 type: string
 *                 enum: [80mm, A4, A5]
 *                 default: 80mm
 *                 description: Paper format for thermal/laser printer (Optional)
 *     responses:
 *       200:
 *         description: Printable invoice payload formatted
 */
router.post(
  "/invoices/print",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.print.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/download:
 *   post:
 *     summary: Download Invoice PDF
 *     description: Generate and download invoice PDF binary buffer.
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "inv_1001"
 *                 description: Target Invoice ID (Required)
 *     responses:
 *       200:
 *         description: Invoice PDF binary file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post(
  "/invoices/download",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.download.bind(invoiceController)
);

export default router;
