import { Router } from "express";
import { couponController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import validate from "../middleware/validate";
import { CreateCouponDto } from "../dto/coupon.dto";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /coupons/create:
 *   post:
 *     summary: Create Coupon
 *     description: >
 *       Create a new discount coupon. Supports both percentage-based and fixed-amount discounts.
 *       Rate limiting on usage is enforced via `usage_limit`.
 *     tags: [Coupons]
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
 *                 example: WELCOME20
 *                 description: "**REQUIRED** Unique coupon code (auto-uppercased)"
 *               discount_type:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *                 example: PERCENTAGE
 *                 description: "**REQUIRED** Type of discount"
 *               discount_value:
 *                 type: number
 *                 example: 20
 *                 description: "**REQUIRED** Percentage (0–100) or fixed INR amount"
 *               max_discount:
 *                 type: number
 *                 example: 500
 *                 description: Maximum discount cap in INR (for percentage coupons)
 *               min_order_value:
 *                 type: number
 *                 example: 200
 *                 description: Minimum cart value to apply this coupon
 *               usage_limit:
 *                 type: integer
 *                 example: 100
 *                 description: Maximum total uses across all customers (0 = unlimited)
 *               per_user_limit:
 *                 type: integer
 *                 example: 1
 *                 description: Max uses per customer (0 = unlimited)
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-31"
 *                 description: Coupon expiry date (null = never expires)
 *               applicable_products:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 202]
 *                 description: Restrict coupon to specific product IDs (empty = all products)
 *               applicable_categories:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [5, 8]
 *                 description: Restrict coupon to specific category IDs (empty = all)
 *               is_active:
 *                 type: boolean
 *                 example: true
 *                 description: Whether coupon is immediately active
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: Duplicate coupon code or validation error
 *       403:
 *         description: Forbidden — Admin role required
 */
router.post(
  "/coupons/create",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("COUPON_CREATE"),
  validate(CreateCouponDto),
  couponController.create.bind(couponController)
);

/**
 * @swagger
 * /coupons/validate:
 *   post:
 *     summary: Validate Coupon Code
 *     description: >
 *       Checks if a coupon code is valid for the current cart without applying it.
 *       Returns the coupon details and computed discount if applicable.
 *     tags: [Coupons]
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
 *               - cart_total
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME20
 *                 description: "**REQUIRED** Coupon code to validate"
 *               cart_total:
 *                 type: number
 *                 example: 1500.00
 *                 description: "**REQUIRED** Current cart total in INR"
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 202]
 *                 description: Optional — product IDs in cart (for product-specific coupons)
 *     responses:
 *       200:
 *         description: Coupon is valid — returns discount details
 *       400:
 *         description: Invalid, expired, or inapplicable coupon
 */
router.post(
  "/coupons/validate",
  authenticateMiddleware,
  couponController.validateCoupon.bind(couponController)
);

/**
 * @swagger
 * /coupons/calculate:
 *   post:
 *     summary: Calculate Coupon Discount
 *     description: >
 *       Computes the exact discount amount for a cart given a coupon code,
 *       respecting the min order value and max discount cap.
 *     tags: [Coupons]
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
 *               - cart_total
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME20
 *                 description: "**REQUIRED** Coupon code"
 *               cart_total:
 *                 type: number
 *                 example: 1500.00
 *                 description: "**REQUIRED** Cart subtotal before discount"
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 202]
 *                 description: Optional product IDs in cart
 *     responses:
 *       200:
 *         description: Discount calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 discount_amount:
 *                   type: number
 *                   example: 300.00
 *                 final_total:
 *                   type: number
 *                   example: 1200.00
 *       400:
 *         description: Invalid coupon or minimum order value not met
 */
router.post(
  "/coupons/calculate",
  authenticateMiddleware,
  couponController.calculate.bind(couponController)
);

/**
 * @swagger
 * /coupons:
 *   get:
 *     summary: Get All Coupons
 *     description: Retrieve all coupons for the active company with optional filters.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active/inactive status
 *       - in: query
 *         name: discount_type
 *         schema:
 *           type: string
 *           enum: [PERCENTAGE, FIXED]
 *         description: Filter by discount type
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
 *         description: Coupon list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Coupon'
 */
router.get(
  "/coupons",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  couponController.getAll.bind(couponController)
);

/**
 * @swagger
 * /coupons/{id}:
 *   put:
 *     summary: Update Coupon
 *     description: Update any field of an existing coupon. Only non-null fields are updated (partial update).
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Coupon ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: SUMMER25
 *               discount_type:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discount_value:
 *                 type: number
 *                 example: 25
 *               max_discount:
 *                 type: number
 *                 example: 750
 *               min_order_value:
 *                 type: number
 *                 example: 300
 *               usage_limit:
 *                 type: integer
 *                 example: 200
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-30"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Coupon updated
 *       404:
 *         description: Coupon not found
 */
router.put(
  "/coupons/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("COUPON_UPDATE"),
  couponController.update.bind(couponController)
);

/**
 * @swagger
 * /coupons/{id}/status:
 *   put:
 *     summary: Toggle Coupon Active Status
 *     description: Quickly enable or disable a coupon without a full update.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Coupon ID to toggle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: false
 *                 description: "**REQUIRED** New status"
 *     responses:
 *       200:
 *         description: Coupon status updated
 *       404:
 *         description: Coupon not found
 */
router.put(
  "/coupons/:id/status",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("COUPON_STATUS"),
  couponController.toggleStatus.bind(couponController)
);

/**
 * @swagger
 * /coupons/{id}:
 *   delete:
 *     summary: Delete Coupon
 *     description: Permanently delete a coupon by ID. This action cannot be undone.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Coupon ID to delete
 *     responses:
 *       200:
 *         description: Coupon deleted
 *       404:
 *         description: Coupon not found
 */
router.delete(
  "/coupons/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("COUPON_DELETE"),
  couponController.delete.bind(couponController)
);

export default router;
