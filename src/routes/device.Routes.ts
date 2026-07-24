/**
 * ============================================================================
 * HARDWARE DEVICES & AUTO-DETECTION ROUTES + SWAGGER API DOCUMENTATION
 * ============================================================================
 */

import { Router } from "express";
import { deviceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: Fetch Hardware Devices
 *     description: Retrieve all registered multi-protocol hardware devices (Printers, Scanners, Scales, Terminals, Displays, Cash Drawers).
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter devices by specific branch ID
 *     responses:
 *       200:
 *         description: List of registered hardware devices
 *       500:
 *         description: Internal server error
 */
router.get("/devices", authenticateMiddleware, deviceController.getDevices.bind(deviceController));

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: Register Hardware Device
 *     description: Register a new WebSerial, WebUSB, Bluetooth, WiFi IP, or Ethernet hardware device.
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               id:
 *                 type: string
 *                 example: DEV-PRN-01
 *               name:
 *                 type: string
 *                 example: Star Micronics TSP100III WiFi Printer
 *               type:
 *                 type: string
 *                 enum: [THERMAL_PRINTER, BARCODE_SCANNER, WEIGH_SCALE, CARD_READER, CUSTOMER_DISPLAY, BIOMETRIC_READER, CASH_DRAWER]
 *               protocol:
 *                 type: string
 *                 enum: [WIFI_IP, ETHERNET_LAN, WEB_SERIAL, WEB_USB, BLUETOOTH, WEBSOCKET_LAN, MQTT_CLOUD, HID_KEYBOARD]
 *               portOrAddress:
 *                 type: string
 *                 example: 192.168.1.105:9100
 *               ipAddress:
 *                 type: string
 *                 example: 192.168.1.105
 *               wifiSsid:
 *                 type: string
 *                 example: STORE_POS_5G
 *               autoReconnect:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Hardware device registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/devices", authenticateMiddleware, deviceController.createDevice.bind(deviceController));

/**
 * @swagger
 * /devices/scan-sync:
 *   post:
 *     summary: Bulk Sync Auto-Detected Hardware
 *     description: Bulk synchronize hardware ports auto-detected via browser WebUSB/WebSerial/LAN scanner.
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               devices:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Devices synchronized successfully
 */
router.post("/devices/scan-sync", authenticateMiddleware, deviceController.syncScan.bind(deviceController));

/**
 * @swagger
 * /devices/{id}:
 *   put:
 *     summary: Update Device Settings
 *     description: Update hardware auto-reconnect toggles, status, or configuration parameters.
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoReconnect:
 *                 type: boolean
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device updated successfully
 */
router.put("/devices/:id", authenticateMiddleware, deviceController.updateDevice.bind(deviceController));

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Remove Hardware Device
 *     description: Delete a hardware device from the active fleet.
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device removed successfully
 */
router.delete("/devices/:id", authenticateMiddleware, deviceController.deleteDevice.bind(deviceController));

/**
 * @swagger
 * /devices/{id}/telemetry:
 *   post:
 *     summary: Log Hardware Telemetry Event
 *     description: Record diagnostic test events (test print ticket, scale zeroing, RJ11 cash pulse).
 *     tags: [Hardware Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 example: PRINT_TEST
 *     responses:
 *       200:
 *         description: Telemetry logged successfully
 */
router.post("/devices/:id/telemetry", authenticateMiddleware, deviceController.recordTelemetry.bind(deviceController));

export default router;
