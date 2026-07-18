import { Router } from "express";
import { paymentCheckoutController } from "../controllers";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payment Checkout
 *   description: Generic Razorpay Standard Web Checkout
 */

/**
 * @swagger
 * /payment/create-order:
 *   post:
 *     summary: Create Razorpay Order
 *     tags: [Payment Checkout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in paise (minimum 100)
 *               currency:
 *                 type: string
 *               receipt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/payment/create-order",
  paymentCheckoutController.createOrder.bind(paymentCheckoutController)
);

/**
 * @swagger
 * /payment/verify-payment:
 *   post:
 *     summary: Verify Razorpay Payment Signature
 *     tags: [Payment Checkout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/payment/verify-payment",
  paymentCheckoutController.verifyPayment.bind(paymentCheckoutController)
);

export default router;
