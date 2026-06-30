import { statusController } from "../controllers";

const express = require("express");
const router = express.Router();

/**
 * Mounted under /api => /api/Status/All, /api/Status/Add, /api/Status/:Id
 */

/**
 * @swagger
 * /Status/All:
 *   get:
 *     summary: List statuses (dropdown source)
 *     tags: [Status]
 */
router.get(
  "/Status/All",
  statusController.index.bind(statusController)
);

/**
 * @swagger
 * /Status/Add:
 *   post:
 *     summary: Create a status
 *     tags: [Status]
 */
router.post(
  "/Status/Add",
  statusController.create.bind(statusController)
);

/**
 * @swagger
 * /Status/Update/{Id}:
 *   post:
 *     summary: Update a status
 *     tags: [Status]
 */
router.post(
  "/Status/Update/:Id",
  statusController.update.bind(statusController)
);

/**
 * @swagger
 * /Status/{Id}:
 *   delete:
 *     summary: Delete a status
 *     tags: [Status]
 */
router.delete(
  "/Status/:Id",
  statusController.deleteItem.bind(statusController)
);

export default router;
