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
 *     description: Public endpoint — returns all available subscription plans with pricing and features.
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Plans retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get(
  "/subscriptions/plans",
  subscriptionController.getPlans.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/current:
 *   get:
 *     summary: Get Current Subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the current active/trialing subscription for logged-in company
 */
router.get(
  "/subscriptions/current",
  authenticateMiddleware,
  subscriptionController.getCurrentSubscription.bind(subscriptionController)
);


/**
 * @swagger
 * /subscriptions/plans:
 *   post:
 *     summary: Create Subscription Plan
 *     description: Super Admin creates a new subscription tier with monthly/yearly pricing and feature set.
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
 *               - name
 *               - monthly_price
 *               - yearly_price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pro Plan
 *                 description: "**REQUIRED** Plan name"
 *               monthly_price:
 *                 type: number
 *                 example: 999.00
 *                 description: "**REQUIRED** Monthly billing price in INR"
 *               yearly_price:
 *                 type: number
 *                 example: 9999.00
 *                 description: "**REQUIRED** Annual billing price in INR"
 *               trial_days:
 *                 type: integer
 *                 example: 14
 *                 description: Optional free trial period in days (0 = no trial)
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Unlimited Users", "POS Billing", "Advanced Reports"]
 *                 description: Optional list of plan features
 *               is_active:
 *                 type: boolean
 *                 example: true
 *                 description: Optional — defaults to true
 *     responses:
 *       201:
 *         description: Subscription plan created
 *       403:
 *         description: Super Admin only
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
 * /subscriptions/start-trial:
 *   post:
 *     summary: Start 14-Day Free Trial
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
 *         description: Trial activated successfully
 */
router.post(
  "/subscriptions/start-trial",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionController.startTrial.bind(subscriptionController)
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
 *     summary: Razorpay Subscription Webhook Endpoint
 *     description: Receiver for automated Razorpay subscription recurring payment notifications.
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 example: "subscription.charged"
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post(
  "/subscriptions/webhook",
  subscriptionController.webhook.bind(subscriptionController)
);

export default router;
