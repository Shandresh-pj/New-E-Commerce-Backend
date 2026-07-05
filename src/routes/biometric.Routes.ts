import { Router } from "express";
import { BiometricController } from "../controllers/biometric.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const ctrl = new BiometricController();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];

/**
 * @swagger
 * tags:
 *   name: Biometric
 *   description: Biometric device and hardware authentication logs API
 */

/**
 * @swagger
 * /biometric/device/register:
 *   post:
 *     summary: Register Biometric Device
 *     description: Registers a new physical biometric device. Generates a unique JWT secret for the device. (Super Admin/Admin only)
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_name
 *               - device_serial
 *               - device_type
 *             properties:
 *               device_name:
 *                 type: string
 *               device_serial:
 *                 type: string
 *                 description: Unique hardware serial key
 *               device_type:
 *                 type: string
 *                 enum: [FINGERPRINT, FACE, RFID, QR, PIN, GPS, HYBRID]
 *               ip_address:
 *                 type: string
 *               location:
 *                 type: string
 *               firmware_version:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device registered successfully
 */
router.post("/biometric/device/register",     authenticateMiddleware, authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }), ctrl.registerDevice.bind(ctrl));

/**
 * @swagger
 * /biometric/device/ping:
 *   post:
 *     summary: Device Heartbeat Ping
 *     description: Heartbeat ping from biometric device firmware to mark online status. (Public endpoint)
 *     tags: [Biometric]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_serial
 *             properties:
 *               device_serial:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ping recorded
 */
router.post("/biometric/device/ping",         ctrl.ping.bind(ctrl));

/**
 * @swagger
 * /biometric/device:
 *   get:
 *     summary: List Biometric Devices
 *     description: Gets all registered devices. (Admin only)
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 */
router.get("/biometric/device",               authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.listDevices.bind(ctrl));

/**
 * @swagger
 * /biometric/device/{id}:
 *   put:
 *     summary: Update Biometric Device
 *     description: Update device parameters, whitelist/blacklist, status, location, etc. (Admin only)
 *     tags: [Biometric]
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
 *               device_name:
 *                 type: string
 *               ip_address:
 *                 type: string
 *               location:
 *                 type: string
 *               is_whitelisted:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, OFFLINE, BANNED]
 *               firmware_version:
 *                 type: string
 *               min_confidence_score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Device updated
 */
router.put("/biometric/device/:id",           authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.updateDevice.bind(ctrl));

/**
 * @swagger
 * /biometric/device/{id}:
 *   delete:
 *     summary: Remove Biometric Device
 *     description: Deletes device configuration. (Super Admin only)
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device deleted
 */
router.delete("/biometric/device/:id",        authenticateMiddleware, authorize({ roles: [UserType.SUPER_ADMIN] }), ctrl.deleteDevice.bind(ctrl));

/**
 * @swagger
 * /biometric/checkin:
 *   post:
 *     summary: Hardware Check-In
 *     description: Process attendance check-in triggered directly by the physical biometric device. Uses device JWT token auth.
 *     tags: [Biometric]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_serial
 *               - device_token
 *               - employee_id
 *             properties:
 *               device_serial:
 *                 type: string
 *               device_token:
 *                 type: string
 *                 description: JWT token signed by device secret
 *               employee_id:
 *                 type: integer
 *               auth_type:
 *                 type: string
 *                 enum: [FINGERPRINT, FACE, RFID, QR, PIN, GPS]
 *               confidence_score:
 *                 type: number
 *               gps_lat:
 *                 type: number
 *               gps_lng:
 *                 type: number
 *     responses:
 *       201:
 *         description: Attendance check-in created
 */
router.post("/biometric/checkin",             ctrl.biometricCheckIn.bind(ctrl));

/**
 * @swagger
 * /biometric/checkout/{attendanceId}:
 *   post:
 *     summary: Hardware Check-Out
 *     description: Process check-out from biometric device.
 *     tags: [Biometric]
 *     parameters:
 *       - in: path
 *         name: attendanceId
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
 *               - device_serial
 *               - device_token
 *               - employee_id
 *             properties:
 *               device_serial:
 *                 type: string
 *               device_token:
 *                 type: string
 *               employee_id:
 *                 type: integer
 *               auth_type:
 *                 type: string
 *               confidence_score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Attendance check-out recorded
 */
router.post("/biometric/checkout/:attendanceId", ctrl.biometricCheckOut.bind(ctrl));

/**
 * @swagger
 * /biometric/break-in:
 *   post:
 *     summary: Hardware Break Start
 *     description: Record break start from biometric device.
 *     tags: [Biometric]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_serial
 *               - device_token
 *               - employee_id
 *               - attendance_id
 *             properties:
 *               device_serial:
 *                 type: string
 *               device_token:
 *                 type: string
 *               employee_id:
 *                 type: integer
 *               attendance_id:
 *                 type: integer
 *               break_type:
 *                 type: string
 *               confidence_score:
 *                 type: number
 *               auth_type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Break started
 */
router.post("/biometric/break-in",            ctrl.biometricBreakIn.bind(ctrl));

/**
 * @swagger
 * /biometric/break-out/{breakLogId}:
 *   post:
 *     summary: Hardware Break End
 *     description: Record break end from biometric device.
 *     tags: [Biometric]
 *     parameters:
 *       - in: path
 *         name: breakLogId
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
 *               - device_serial
 *               - device_token
 *               - employee_id
 *             properties:
 *               device_serial:
 *                 type: string
 *               device_token:
 *                 type: string
 *               employee_id:
 *                 type: integer
 *               auth_type:
 *                 type: string
 *               confidence_score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Break ended
 */
router.post("/biometric/break-out/:breakLogId", ctrl.biometricBreakOut.bind(ctrl));

/**
 * @swagger
 * /biometric/logs:
 *   get:
 *     summary: Get Biometric Logs
 *     description: Retrieve audit logs of biometric authentication attempts.
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 */
router.get("/biometric/logs",                 authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.logs.bind(ctrl));

export default router;
