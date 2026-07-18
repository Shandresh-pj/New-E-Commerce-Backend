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
 *   description: Subscription Coupon Management
 */

/**
 * @swagger
 * /subscription-coupons:
 *   get:
 *     summary: Get All Subscription Coupons
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discount_type:
 *                 type: string
 *               discount_value:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
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
 *     tags: [SubscriptionCoupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               company_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/subscription-coupons/validate",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] }),
  subscriptionCouponController.validateCoupon.bind(subscriptionCouponController)
);

export default router;
