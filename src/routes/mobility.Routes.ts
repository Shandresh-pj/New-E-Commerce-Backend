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

/**
 * @swagger
 * /mobility/categories:
 *   get:
 *     summary: Fetch Dynamic Vehicle Categories & Pricing Matrix
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active vehicle categories with fare rates and capacity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 7
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "sedan"
 *                       name:
 *                         type: string
 *                         example: "Prime Sedan"
 *                       type:
 *                         type: string
 *                         example: "Passenger"
 *                       icon:
 *                         type: string
 *                         example: "ri-car-line"
 *                       baseFare:
 *                         type: number
 *                         example: 70
 *                       perKm:
 *                         type: number
 *                         example: 18
 *                       perMin:
 *                         type: number
 *                         example: 2.5
 *                       capacity:
 *                         type: string
 *                         example: "4"
 *                       luggage:
 *                         type: string
 *                         example: "3 Bags"
 *                       eta:
 *                         type: string
 *                         example: "5 mins"
 *                       isEV:
 *                         type: boolean
 *                         example: false
 *                       tag:
 *                         type: string
 *                         example: "Comfort"
 */
router.get(
  "/mobility/categories",
  authenticateMiddleware,
  authorize(),
  mobilityController.getCategories.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/rentals/catalog:
 *   get:
 *     summary: Get Rental Vehicles Catalog & Hourly/Daily Packages
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catalog of self-drive and chauffeur rental vehicles with packages
 */
router.get(
  "/mobility/rentals/catalog",
  authenticateMiddleware,
  authorize(),
  mobilityController.getRentalCatalog.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/corporate/rosters:
 *   get:
 *     summary: Get Corporate Transport Schedules & Employee Rosters
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active corporate transport routes and assigned employees
 */
router.get(
  "/mobility/corporate/rosters",
  authenticateMiddleware,
  authorize(),
  mobilityController.getCorporateRosters.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/trips/{tripId}/track:
 *   get:
 *     summary: Real-Time Live Trip Tracking Telemetry
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         example: "TRIP-998241"
 *     responses:
 *       200:
 *         description: Real-time driver location, pickup/destination, ETA, distance and speed
 */
router.get(
  "/mobility/trips/:tripId/track",
  authenticateMiddleware,
  authorize(),
  mobilityController.getTripTracking.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/trips/{tripId}/replay:
 *   get:
 *     summary: Historical GPS Route Animation Trace Replay
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         example: "TRIP-998241"
 *     responses:
 *       200:
 *         description: Array of sequential GPS points with speed, heading, and status
 */
router.get(
  "/mobility/trips/:tripId/replay",
  authenticateMiddleware,
  authorize(),
  mobilityController.getTripReplay.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/driver/{driverId}/location:
 *   get:
 *     summary: Get Specific Driver Current Live GPS Coordinates
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Driver latitude, longitude, heading, and speed
 */
router.get(
  "/mobility/driver/:driverId/location",
  authenticateMiddleware,
  authorize(),
  mobilityController.getDriverLocation.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/bookings/status:
 *   post:
 *     summary: Update Booking Status by Booking Code
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
 *               - bookingId
 *               - status
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "TRIP-998241"
 *               status:
 *                 type: string
 *                 enum: [SEARCHING, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: "ACCEPTED"
 *     responses:
 *       200:
 *         description: Booking status updated and broadcasted via Socket.IO
 */
router.post(
  "/mobility/bookings/status",
  authenticateMiddleware,
  authorize(),
  mobilityController.updateBookingByCode.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/bookings/assign-driver:
 *   post:
 *     summary: Assign Driver to Active Booking
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
 *               - bookingId
 *               - driverId
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "TRIP-998241"
 *               driverId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Driver assigned and notification emitted
 */
router.post(
  "/mobility/bookings/assign-driver",
  authenticateMiddleware,
  authorize(),
  mobilityController.assignDriver.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/verification/drivers:
 *   get:
 *     summary: List All Drivers Pending KYC Verification
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver verification records with license and badge details
 */
router.get(
  "/mobility/verification/drivers",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  mobilityController.getVerificationDrivers.bind(mobilityController)
);

/**
 * @swagger
 * /mobility/verification/vehicles:
 *   get:
 *     summary: List All Vehicles Pending RC/KYC Verification
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle verification records with RC, permit, and insurance details
 */
router.get(
  "/mobility/verification/vehicles",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  mobilityController.getVerificationVehicles.bind(mobilityController)
);

/**
 * @swagger
 * /verification/drivers:
 *   get:
 *     summary: Driver Verification List
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver verification list
 */
router.get(
  "/verification/drivers",
  authenticateMiddleware,
  authorize(),
  mobilityController.getVerificationDrivers.bind(mobilityController)
);

router.get(
  "/v1/verification/drivers",
  authenticateMiddleware,
  authorize(),
  mobilityController.getVerificationDrivers.bind(mobilityController)
);

/**
 * @swagger
 * /verification/vehicles:
 *   get:
 *     summary: Vehicle Verification List
 *     tags: [Mobility Super App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle verification list
 */
router.get(
  "/verification/vehicles",
  authenticateMiddleware,
  authorize(),
  mobilityController.getVerificationVehicles.bind(mobilityController)
);

router.get(
  "/v1/verification/vehicles",
  authenticateMiddleware,
  authorize(),
  mobilityController.getVerificationVehicles.bind(mobilityController)
);

export default router;



