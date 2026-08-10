import { statusController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /Status/All:
 *   get:
 *     summary: List All Status Master Records
 *     description: Retrieve list of status master lookup options for dropdowns.
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of status records retrieved
 *       401:
 *         description: Unauthorized
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
 *               - StatusName
 *             properties:
 *               StatusName:
 *                 type: string
 *                 example: "IN_TRANSIT"
 *                 description: Status identifier or display label
 *               Description:
 *                 type: string
 *                 example: "Package currently in transport"
 *     responses:
 *       201:
 *         description: Status created successfully
 *       400:
 *         description: Status name required or already exists
 *       401:
 *         description: Unauthorized
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - StatusName
 *             properties:
 *               StatusName:
 *                 type: string
 *                 example: "DELIVERED_CONFIRMED"
 *               Description:
 *                 type: string
 *                 example: "Delivery verified by customer OTP"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Status record not found
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
 *     responses:
 *       200:
 *         description: Status deleted successfully
 *       404:
 *         description: Status record not found
 */
router.delete(
  "/Status/:Id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  statusController.deleteItem.bind(statusController)
);

export default router;
