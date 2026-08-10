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
 *     description: >
 *       Creates a new delivery tracking record and marks the order as IN_TRANSIT.
 *       The delivery boy's current GPS location can optionally be recorded at start.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartDeliveryBody'
 *           example:
 *             order_id: 5501
 *             delivery_boy_id: 45
 *             notes: Handle with care
 *     responses:
 *       201:
 *         description: Delivery started and tracking record created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DeliveryTracking'
 *       400:
 *         description: Order is not in a deliverable state
 *       404:
 *         description: Order not found
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
 *     summary: Update Live GPS Location
 *     description: >
 *       Updates the real-time GPS coordinates for an active delivery.
 *       Call this endpoint periodically from the delivery boy's device to keep
 *       the tracking map up to date.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracking_id
 *               - lat
 *               - lng
 *             properties:
 *               tracking_id:
 *                 type: integer
 *                 example: 201
 *                 description: Active tracking session ID
 *               lat:
 *                 type: number
 *                 example: 13.0827
 *                 description: Current latitude
 *               lng:
 *                 type: number
 *                 example: 80.2707
 *                 description: Current longitude
 *               heading:
 *                 type: number
 *                 example: 180.5
 *                 description: Compass direction heading in degrees
 *     responses:
 *       200:
 *         description: GPS location updated
 *       404:
 *         description: Tracking record not found
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
 *     summary: Track Order by Order ID
 *     description: >
 *       Returns the current delivery tracking record for a specific order,
 *       including the live GPS coordinates of the delivery boy.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5501
 *         description: Order ID to track
 *     responses:
 *       200:
 *         description: Tracking details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DeliveryTracking'
 *       404:
 *         description: No active tracking found for this order
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
 *     summary: Get All Delivery Trackings
 *     description: Retrieve all delivery tracking records for the company/branch with optional filters.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PICKED_UP, IN_TRANSIT, DELIVERED, FAILED]
 *         description: Filter by tracking status
 *       - in: query
 *         name: delivery_boy_id
 *         schema:
 *           type: integer
 *           example: 45
 *         description: Filter by delivery boy ID
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-08-01"
 *         description: Start date filter
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-08-31"
 *         description: End date filter
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
 *         description: Tracking list retrieved
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
 *                         $ref: '#/components/schemas/DeliveryTracking'
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
 *     summary: Mark Order as Delivered
 *     description: >
 *       Marks the tracking record as DELIVERED and updates the order status accordingly.
 *       Optionally records proof-of-delivery notes.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 201
 *         description: Tracking record ID to mark as delivered
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proof_notes:
 *                 type: string
 *                 example: Delivered to neighbour (flat 4B)
 *                 description: Optional proof-of-delivery notes
 *               signature_image:
 *                 type: string
 *                 example: /uploads/signatures/sig_201.png
 *                 description: Optional path to signature image
 *     responses:
 *       200:
 *         description: Order marked as delivered
 *       404:
 *         description: Tracking record not found
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
 *     summary: Delete Tracking Record
 *     description: Permanently delete a delivery tracking record. Only Admin and Super Admin can perform this action.
 *     tags: [Delivery Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 201
 *         description: Tracking record ID to delete
 *     responses:
 *       200:
 *         description: Tracking record deleted
 *       403:
 *         description: Forbidden — Delivery Boy cannot delete records
 *       404:
 *         description: Tracking record not found
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
