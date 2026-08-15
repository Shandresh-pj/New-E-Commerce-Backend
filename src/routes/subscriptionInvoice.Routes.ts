import { Router } from "express";
import { subscriptionInvoiceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscription Invoices
 *   description: Subscription billing invoices and payment tax receipts
 */

/**
 * @swagger
 * /subscription-invoices:
 *   get:
 *     summary: Get All Subscription Invoices
 *     description: Retrieve all subscription invoices, GST tax breakdowns, and payment statuses for the active company.
 *     tags: [Subscription Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscription invoices retrieved successfully
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
 *                       invoice_number:
 *                         type: string
 *                         example: "INV-SUB-2026-001"
 *                       company_id:
 *                         type: integer
 *                         example: 1
 *                       amount:
 *                         type: number
 *                         example: 999.00
 *                       gst_amount:
 *                         type: number
 *                         example: 179.82
 *                       subtotal:
 *                         type: number
 *                         example: 819.18
 *                       status:
 *                         type: string
 *                         enum: [paid, pending, failed, refunded]
 *                         example: "paid"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-01T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/subscription-invoices",
  authenticateMiddleware,
  subscriptionInvoiceController.getInvoices.bind(subscriptionInvoiceController)
);

/**
 * @swagger
 * /subscription-invoices/{id}:
 *   get:
 *     summary: Get Subscription Invoice Details
 *     description: Retrieve itemized invoice details and tax breakdown by invoice ID.
 *     tags: [Subscription Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Subscription invoice details retrieved successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     invoice_number:
 *                       type: string
 *                       example: "INV-SUB-2026-001"
 *                     amount:
 *                       type: number
 *                       example: 999.00
 *                     status:
 *                       type: string
 *                       example: "paid"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/subscription-invoices/:id",
  authenticateMiddleware,
  subscriptionInvoiceController.getInvoiceDetails.bind(subscriptionInvoiceController)
);

export default router;
