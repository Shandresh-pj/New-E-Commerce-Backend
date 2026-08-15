import { Router } from "express";
import { billingController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing & Invoice History
 */

/**
 * @swagger
 * /billing/history:
 *   get:
 *     summary: Get Billing History
 *     description: Retrieve all billing invoices and subscription payment records.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing history retrieved successfully
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
 *                       subscription_id:
 *                         type: integer
 *                         example: 10
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
 *                       currency:
 *                         type: string
 *                         example: "INR"
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
  "/billing/history",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  billingController.getBillingHistory.bind(billingController)
);

/**
 * @swagger
 * /billing/refund:
 *   post:
 *     summary: Refund Payment
 *     description: Initiate a full or partial refund for a paid subscription invoice (Super Admin only).
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoice_id
 *             properties:
 *               invoice_id:
 *                 type: integer
 *                 example: 1
 *                 description: "**REQUIRED** Subscription invoice ID to refund"
 *               amount:
 *                 type: number
 *                 example: 499.00
 *                 description: Refund amount in INR (if omitted, full invoice amount is refunded)
 *               reason:
 *                 type: string
 *                 example: "Customer downgrade request"
 *                 description: Reason for issuing the refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
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
 *                       example: 5
 *                     transaction_id:
 *                       type: integer
 *                       example: 1
 *                     company_id:
 *                       type: integer
 *                       example: 1
 *                     razorpay_refund_id:
 *                       type: string
 *                       example: "rfnd_N8x2yZ99"
 *                     amount:
 *                       type: number
 *                       example: 499.00
 *                     refund_type:
 *                       type: string
 *                       enum: [full, partial]
 *                       example: "partial"
 *                     status:
 *                       type: string
 *                       example: "processed"
 *                     reason:
 *                       type: string
 *                       example: "Customer downgrade request"
 *       400:
 *         description: Invalid invoice or refund not eligible
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/billing/refund",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  billingController.processRefund.bind(billingController)
);

export default router;
