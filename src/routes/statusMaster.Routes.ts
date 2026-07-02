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
 *     summary: List statuses (dropdown source)
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Create a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Update a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Delete a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/Status/:Id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  statusController.deleteItem.bind(statusController)
);

export default router;
