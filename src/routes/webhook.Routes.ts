import { Router } from "express";
import { webhookController } from "../controllers";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: External service webhooks
 */

/**
 * @swagger
 * /webhooks/razorpay:
 *   post:
 *     summary: Razorpay Webhook
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/webhooks/razorpay",
  webhookController.razorpayWebhook.bind(webhookController)
);

export default router;
