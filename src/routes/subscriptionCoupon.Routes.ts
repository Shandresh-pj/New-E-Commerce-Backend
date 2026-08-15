import { Router } from "express";
import { subscriptionCouponController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: SubscriptionCoupons
 *   description: SaaS subscription discount coupon and voucher management
 */

/**
 * @swagger
 * /subscription-coupons:
 *   get:
 *     summary: Get All Subscription Coupons
 *     description: Retrieve all subscription promotional coupons, discounts, and validity rules.
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscription coupons retrieved successfully
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
 *                       code:
 *                         type: string
 *                         example: "SUMMER50"
 *                       discount_type:
 *                         type: string
 *                         enum: [percentage, flat, extra_days, extra_months, free_trial_extension]
 *                         example: "percentage"
 *                       discount_value:
 *                         type: number
 *                         example: 50.00
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/subscription-coupons",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionCouponController.getCoupons.bind(subscriptionCouponController)
);

/**
 * @swagger
 * /subscription-coupons:
 *   post:
 *     summary: Create Subscription Coupon
 *     description: Register a new discount coupon code for SaaS subscriptions (Super Admin only).
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discount_type
 *               - discount_value
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAVE20"
 *                 description: "**REQUIRED** Coupon code string"
 *               discount_type:
 *                 type: string
 *                 enum: [percentage, flat, extra_days, extra_months, free_trial_extension]
 *                 example: "percentage"
 *                 description: "**REQUIRED** Discount computation model"
 *               discount_value:
 *                 type: number
 *                 example: 20.00
 *                 description: "**REQUIRED** Discount value or percentage"
 *               min_order_value:
 *                 type: number
 *                 example: 500.00
 *                 description: Minimum subscription plan amount required
 *               usage_limit:
 *                 type: integer
 *                 example: 100
 *                 description: Max total times coupon can be redeemed
 *     responses:
 *       201:
 *         description: Coupon created successfully
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
 *       400:
 *         description: Coupon code already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       500:
 *         description: Internal server error
 */
router.post(
  "/subscription-coupons",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  subscriptionCouponController.createCoupon.bind(subscriptionCouponController)
);

/**
 * @swagger
 * /subscription-coupons/validate:
 *   post:
 *     summary: Validate Subscription Coupon
 *     description: Checks if a promotional coupon code is valid for a given subscription order.
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - amount
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAVE20"
 *                 description: "**REQUIRED** Coupon code"
 *               company_id:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 example: 999.00
 *                 description: "**REQUIRED** Current plan order amount"
 *     responses:
 *       200:
 *         description: Coupon validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 discount_amount:
 *                   type: number
 *                   example: 199.80
 *                 final_amount:
 *                   type: number
 *                   example: 799.20
 *       400:
 *         description: Coupon expired, inactive or usage limit reached
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/subscription-coupons/validate",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionCouponController.validateCoupon.bind(subscriptionCouponController)
);

export default router;
