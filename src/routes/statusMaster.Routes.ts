import { statusController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const express = require("express");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Status
 *   description: Master status lookup and system workflow status transitions
 */

/**
 * @swagger
 * /Status/All:
 *   get:
 *     summary: List All Status Master Records
 *     description: Retrieve list of status master lookup options for dropdowns.
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: StatusFor
 *         schema:
 *           type: string
 *         description: Filter status by module domain (e.g. ORDER, PRODUCT, LEAVE)
 *         example: "ORDER"
 *     responses:
 *       200:
 *         description: List of status records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Statuses fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "PENDING"
 *                       module:
 *                         type: string
 *                         example: "ORDER"
 *                       color_code:
 *                         type: string
 *                         example: "#3B82F6"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/Status/All",
  authenticateMiddleware,
  authorize(),
  statusController.index.bind(statusController)
);

/**
 * @swagger
 * /Status/Add:
 *   post:
 *     summary: Create New Status Record
 *     description: Register a new status option in the master status lookup table.
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - StatusCode
 *             properties:
 *               StatusCode:
 *                 type: string
 *                 example: "IN_TRANSIT"
 *                 description: "**REQUIRED** Unique uppercase status code"
 *               StatusName:
 *                 type: string
 *                 example: "In Transit"
 *                 description: Display label
 *               StatusFor:
 *                 type: string
 *                 example: "ORDER"
 *                 description: Target module domain
 *               Description:
 *                 type: string
 *                 example: "Package currently in transport"
 *     responses:
 *       201:
 *         description: Status created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Status created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Status name required or already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/Status/Add",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  statusController.create.bind(statusController)
);

/**
 * @swagger
 * /Status/Update/{Id}:
 *   post:
 *     summary: Update Status Record
 *     description: Modify details of an existing master status record.
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Status ID to update
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               StatusCode:
 *                 type: string
 *                 example: "DELIVERED_CONFIRMED"
 *               StatusName:
 *                 type: string
 *                 example: "Delivered & Confirmed"
 *               StatusFor:
 *                 type: string
 *                 example: "ORDER"
 *               Description:
 *                 type: string
 *                 example: "Delivery verified by customer OTP"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Status updated successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Status record not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/Status/Update/:Id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  statusController.update.bind(statusController)
);

/**
 * @swagger
 * /Status/{Id}:
 *   delete:
 *     summary: Delete Status Record
 *     description: Remove a status record from the master lookup table by ID.
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Status ID to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Status deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Status deleted successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Status record not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/Status/:Id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  statusController.deleteItem.bind(statusController)
);

export default router;
