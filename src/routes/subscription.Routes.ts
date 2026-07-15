import { Router } from "express";
import { subscriptionController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription & Billing Management
 */

/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     summary: Get All Subscription Plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/subscriptions/plans",
  subscriptionController.getPlans.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/plans:
 *   post:
 *     summary: Create Subscription Plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               monthly_price:
 *                 type: number
 *               yearly_price:
 *                 type: number
 *               trial_days:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/subscriptions/plans",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  subscriptionController.createPlan.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/plans/{id}:
 *   put:
 *     summary: Update Subscription Plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               monthly_price:
 *                 type: number
 *               yearly_price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/subscriptions/plans/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  subscriptionController.updatePlan.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to Plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_id
 *               - billing_cycle
 *             properties:
 *               plan_id:
 *                 type: integer
 *               billing_cycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               company_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Returns Razorpay order details
 */
router.post(
  "/subscriptions/subscribe",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionController.subscribe.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/verify:
 *   post:
 *     summary: Verify Subscription Payment
 *     tags: [Subscriptions]
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
 *             properties:
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and subscription activated
 */
router.post(
  "/subscriptions/verify",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionController.verifyPayment.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/webhook:
 *   post:
 *     summary: Razorpay Webhook Endpoint
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Webhook received successfully
 */
router.post(
  "/subscriptions/webhook",
  subscriptionController.webhook.bind(subscriptionController)
);

export default router;
