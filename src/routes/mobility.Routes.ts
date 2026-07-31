import { Router } from "express";
import { mobilityController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import validate from "../middleware/validate";
import {
  NearbyVehiclesDto,
  FareEstimateDto,
  CreateMobilityBookingDto,
  UpdateBookingStatusDto,
  DriverLocationPingDto,
  VerifyKycDto,
} from "../dto";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /mobility/vehicles/nearby:
 *   post:
 *     summary: Fetch Nearby Available Drivers & Vehicles
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 12.9716
 *               longitude:
 *                 type: number
 *                 example: 77.5946
 *               category:
 *                 type: string
 *                 example: "SEDAN"
 *               radius_km:
 *                 type: number
 *                 example: 10
 *     responses:
 *       200:
 *         description: List of nearby drivers and vehicles within radius
 */
router.post(
  "/mobility/vehicles/nearby",
  authenticateMiddleware,
  authorize(),
  validate(NearbyVehiclesDto),
  mobilityController.getNearbyVehicles.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/fare-estimate:
 *   post:
 *     summary: Calculate Dynamic Mobility Fare Estimate
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distance_km
 *               - duration_minutes
 *               - vehicle_category
 *             properties:
 *               distance_km:
 *                 type: number
 *                 example: 8.5
 *               duration_minutes:
 *                 type: number
 *                 example: 22
 *               vehicle_category:
 *                 type: string
 *                 example: "SEDAN"
 *               booking_type:
 *                 type: string
 *                 enum: [RIDE, TAXI, RENTAL, PARCEL, CORPORATE, OUTSTATION]
 *                 example: "RIDE"
 *     responses:
 *       200:
 *         description: Fare breakdown with taxes and base rates
 */
router.post(
  "/mobility/fare-estimate",
  authenticateMiddleware,
  authorize(),
  validate(FareEstimateDto),
  mobilityController.calculateFare.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/bookings:
 *   post:
 *     summary: Create Mobility Booking (Ride / Rental / Parcel)
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_category
 *               - pickup_address
 *               - pickup_latitude
 *               - pickup_longitude
 *               - drop_address
 *               - drop_latitude
 *               - drop_longitude
 *               - distance_km
 *               - estimated_duration_minutes
 *               - total_fare
 *             properties:
 *               booking_type:
 *                 type: string
 *                 example: "RIDE"
 *               vehicle_category:
 *                 type: string
 *                 example: "SEDAN"
 *               pickup_address:
 *                 type: string
 *                 example: "Koramangala 5th Block, Bengaluru"
 *               pickup_latitude:
 *                 type: number
 *                 example: 12.9352
 *               pickup_longitude:
 *                 type: number
 *                 example: 77.6245
 *               drop_address:
 *                 type: string
 *                 example: "MG Road, Bengaluru"
 *               drop_latitude:
 *                 type: number
 *                 example: 12.9716
 *               drop_longitude:
 *                 type: number
 *                 example: 77.5946
 *               distance_km:
 *                 type: number
 *                 example: 6.2
 *               estimated_duration_minutes:
 *                 type: number
 *                 example: 18
 *               total_fare:
 *                 type: number
 *                 example: 195.00
 *               payment_method:
 *                 type: string
 *                 example: "CASH"
 *     responses:
 *       200:
 *         description: Booking created successfully with assigned driver
 */
router.post(
  "/mobility/bookings",
  authenticateMiddleware,
  authorize(),
  validate(CreateMobilityBookingDto),
  mobilityController.createBooking.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/bookings:
 *   get:
 *     summary: Get All Mobility Bookings
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings for current company
 */
router.get(
  "/mobility/bookings",
  authenticateMiddleware,
  authorize(),
  mobilityController.getBookings.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/bookings/{id}/status:
 *   put:
 *     summary: Update Booking Status (ACCEPTED / IN_PROGRESS / COMPLETED)
 *     tags: [Mobility Super App]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SEARCHING, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Booking status updated
 */
router.put(
  "/mobility/bookings/:id/status",
  authenticateMiddleware,
  authorize(),
  validate(UpdateBookingStatusDto),
  mobilityController.updateBookingStatus.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/drivers/location:
 *   post:
 *     summary: Driver Location Telemetry Ping
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driver_id
 *               - latitude
 *               - longitude
 *             properties:
 *               driver_id:
 *                 type: integer
 *                 example: 1
 *               latitude:
 *                 type: number
 *                 example: 12.9720
 *               longitude:
 *                 type: number
 *                 example: 77.5950
 *     responses:
 *       200:
 *         description: Location updated and broadcasted via Socket.IO
 */
router.post(
  "/mobility/drivers/location",
  authenticateMiddleware,
  authorize(),
  validate(DriverLocationPingDto),
  mobilityController.updateDriverLocation.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/fleet/metrics:
 *   get:
 *     summary: Fetch Real-Time Fleet & Operational Metrics
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fleet operational efficiency, active rides, and telemetry summaries
 */
router.get(
  "/mobility/fleet/metrics",
  authenticateMiddleware,
  authorize(),
  mobilityController.getFleetMetrics.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/kyc/verify:
 *   post:
 *     summary: Verify Driver or Vehicle KYC Documents
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - id
 *               - status
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [DRIVER, VEHICLE]
 *               id:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: KYC status updated
 */
router.post(
  "/mobility/kyc/verify",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  validate(VerifyKycDto),
  mobilityController.verifyKyc.bind(mobilityController)
);

export default router;
