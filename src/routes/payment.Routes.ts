import { Router } from "express";
import { paymentController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Record Manual Payment
 *     description: Record a manual / offline payment for an order (cash, card, or UPI).
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - amount
 *               - payment_method
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 5501
 *               amount:
 *                 type: number
 *                 example: 1499.00
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, BANK_TRANSFER]
 *                 example: "UPI"
 *               transaction_id:
 *                 type: string
 *                 example: "TXN8844123"
 *               notes:
 *                 type: string
 *                 example: "Paid via Google Pay"
 *     responses:
 *       201:
 *         description: Payment recorded and order status updated
 *       400:
 *         description: Invalid order or payment amount
 *       404:
 *         description: Order not found
 */
router.post(
  "/payments/create",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("PAYMENT"),
  paymentController.create.bind(paymentController)
);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get All Payments
 *     description: Retrieve all payment records for the active company with optional filters.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: order_id
 *         schema:
 *           type: integer
 *           example: 5501
 *         description: Filter by order ID
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *           enum: [CASH, CARD, UPI, RAZORPAY]
 *         description: Filter by payment method
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *         description: Filter by payment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Payment list retrieved successfully
 */
router.get(
  "/payments",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  paymentController.getAll.bind(paymentController)
);

/**
 * @swagger
 * /payments/razorpay/create-order:
 *   post:
 *     summary: Create Razorpay Order
 *     description: Initiates a Razorpay payment order. Returns a Razorpay order_id and key_id.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1499.00
 *               currency:
 *                 type: string
 *                 default: "INR"
 *                 example: "INR"
 *               receipt:
 *                 type: string
 *                 example: "rcpt_ord5501"
 *     responses:
 *       200:
 *         description: Razorpay order created
 *       500:
 *         description: Razorpay API error
 */
router.post(
  "/payments/razorpay/create-order",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  paymentController.createRazorpayOrder.bind(paymentController)
);

/**
 * @swagger
 * /payments/razorpay/verify:
 *   post:
 *     summary: Verify Razorpay Payment Signature
 *     description: Verifies the HMAC-SHA256 signature returned by Razorpay after payment.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_payment_id
 *               - razorpay_order_id
 *               - razorpay_signature
 *               - order_id
 *             properties:
 *               razorpay_payment_id:
 *                 type: string
 *                 example: "pay_P123456789"
 *               razorpay_order_id:
 *                 type: string
 *                 example: "order_N5GqlgJiknVK1A"
 *               razorpay_signature:
 *                 type: string
 *                 example: "b59c8b3ab47d8c27f5f5b7d2ae04..."
 *               order_id:
 *                 type: integer
 *                 example: 5501
 *     responses:
 *       200:
 *         description: Payment verified and order updated
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Order not found
 */
router.post(
  "/payments/razorpay/verify",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  paymentController.verifyRazorpayPayment.bind(paymentController)
);

/**
 * @swagger
 * /payments/{id}/verify:
 *   post:
 *     summary: Verify Manual Payment
 *     description: Verify an offline/manual payment record and confirm the associated order.
 *     tags: [Payments]
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
 *         description: Payment verified
 */
router.post(
  "/payments/:id/verify",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  paymentController.verifyManualPayment.bind(paymentController)
);

/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     summary: Refund Payment
 *     description: Mark a payment as REFUNDED and cancel the associated order.
 *     tags: [Payments]
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
 *         description: Payment refunded
 */
router.post(
  "/payments/:id/refund",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  paymentController.refundPayment.bind(paymentController)
);

router.delete(
  "/payments/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  paymentController.refundPayment.bind(paymentController)
);

export default router;
