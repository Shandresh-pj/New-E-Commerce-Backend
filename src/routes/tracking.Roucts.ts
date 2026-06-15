import { Router } from "express";
import { deliveryTrackingController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /delivery-tracking/start:
 *   post:
 *     summary: Start Delivery
 *     tags: [Delivery Tracking]
 *     responses:
 *       200:
 *         description: Delivery started successfully
 */
router.post(
  "/delivery-tracking/start",
  deliveryTrackingController.startDelivery.bind(
    deliveryTrackingController
  )
);

/**
 * @swagger
 * /delivery-tracking/location:
 *   post:
 *     summary: Update Live Location
 *     tags: [Delivery Tracking]
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.post(
  "/delivery-tracking/location",
  deliveryTrackingController.updateLocation.bind(
    deliveryTrackingController
  )
);

/**
 * @swagger
 * /delivery-tracking/order/{order_id}:
 *   get:
 *     summary: Track Order
 *     tags: [Delivery Tracking]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tracking fetched successfully
 */
router.get(
  "/delivery-tracking/order/:order_id",
  deliveryTrackingController.getTracking.bind(
    deliveryTrackingController
  )
);

/**
 * @swagger
 * /delivery-tracking:
 *   get:
 *     summary: Get All Tracking
 *     tags: [Delivery Tracking]
 *     responses:
 *       200:
 *         description: Tracking list fetched successfully
 */
router.get(
  "/delivery-tracking",
  deliveryTrackingController.getAll.bind(
    deliveryTrackingController
  )
);

/**
 * @swagger
 * /delivery-tracking/delivered/{id}:
 *   post:
 *     summary: Mark Delivered
 *     tags: [Delivery Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order marked as delivered
 */
router.post(
  "/delivery-tracking/delivered/:id",
  deliveryTrackingController.delivered.bind(
    deliveryTrackingController
  )
);

/**
 * @swagger
 * /delivery-tracking/{id}:
 *   delete:
 *     summary: Delete Tracking
 *     tags: [Delivery Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tracking deleted successfully
 */
router.delete(
  "/delivery-tracking/:id",
  deliveryTrackingController.deleteTracking.bind(
    deliveryTrackingController
  )
);

export default router;