import { Router } from "express";
import { deliveryTrackingController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /delivery-tracking/start:
 *   post:
 *     summary: Start Delivery
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/delivery-tracking/start",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.DELIVERY_BOY],
  }),
  deliveryTrackingController.startDelivery.bind(deliveryTrackingController)
);

/**
 * @swagger
 * /delivery-tracking/location:
 *   post:
 *     summary: Update Live Location
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/delivery-tracking/location",
  authenticateMiddleware,
  authorize({
    roles: [UserType.DELIVERY_BOY, UserType.BRANCH_MANAGER, UserType.ADMIN, UserType.SUPER_ADMIN],
  }),
  deliveryTrackingController.updateLocation.bind(deliveryTrackingController)
);

/**
 * @swagger
 * /delivery-tracking/order/{order_id}:
 *   get:
 *     summary: Track Order
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/delivery-tracking/order/:order_id",
  authenticateMiddleware,
  authorize(),
  deliveryTrackingController.getTracking.bind(deliveryTrackingController)
);

/**
 * @swagger
 * /delivery-tracking:
 *   get:
 *     summary: Get All Tracking
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/delivery-tracking",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  deliveryTrackingController.getAll.bind(deliveryTrackingController)
);

/**
 * @swagger
 * /delivery-tracking/delivered/{id}:
 *   post:
 *     summary: Mark Delivered
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/delivery-tracking/delivered/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.DELIVERY_BOY, UserType.BRANCH_MANAGER, UserType.ADMIN, UserType.SUPER_ADMIN],
  }),
  deliveryTrackingController.delivered.bind(deliveryTrackingController)
);

/**
 * @swagger
 * /delivery-tracking/{id}:
 *   delete:
 *     summary: Delete Tracking
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/delivery-tracking/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
    denyDelete: [UserType.DELIVERY_BOY],
  }),
  auditMiddleware("DELIVERY"),
  deliveryTrackingController.deleteTracking.bind(deliveryTrackingController)
);

export default router;
