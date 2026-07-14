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
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Validate Coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/coupons/validate",
  authenticateMiddleware,
  couponController.validateCoupon.bind(couponController)
);

/**
 * @swagger
 * /coupons:
 *   get:
 *     summary: Get All Coupons
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
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
 * /coupons/{id}:
 *   delete:
 *     summary: Delete Coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
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
