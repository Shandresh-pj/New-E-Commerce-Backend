import { Router } from "express";
import { webhookController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /webhooks/razorpay:
 *   post:
 *     summary: Razorpay Webhook Endpoint
 *     description: External webhook endpoint for Razorpay payment captured, authorized, and order update events.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - payload
 *             properties:
 *               event:
 *                 type: string
 *                 example: "payment.captured"
 *                 description: Event identifier string from Razorpay
 *               payload:
 *                 type: object
 *                 description: Event payload data structure
 *     responses:
 *       200:
 *         description: Webhook event processed successfully
 *       400:
 *         description: Invalid signature or payload structure
 */
router.post(
  "/webhooks/razorpay",
  webhookController.razorpayWebhook.bind(webhookController)
);

export default router;
