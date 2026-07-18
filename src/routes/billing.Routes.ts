import { Router } from "express";
import { billingController } from "../controllers";

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
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/billing/history",
  billingController.getBillingHistory.bind(billingController)
);

/**
 * @swagger
 * /billing/refund:
 *   post:
 *     summary: Refund Payment
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoice_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/billing/refund",
  billingController.processRefund.bind(billingController)
);

export default router;
