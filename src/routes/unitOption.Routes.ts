import { Router } from "express";
import { unitOptionController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: UnitOptions
 *   description: Master unit measurement options (Piece, Kg, Gram, Liter, Box, Meter, etc.)
 */

/**
 * @swagger
 * /unit-options:
 *   get:
 *     summary: Get All Unit Options
 *     description: Retrieve list of all unit options available for catalog and products. Auto-seeds standard unit options if table is empty.
 *     tags: [UnitOptions]
 *     responses:
 *       200:
 *         description: List of unit options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                         example: "Piece"
 *                       symbol:
 *                         type: string
 *                         example: "pc"
 *                       category:
 *                         type: string
 *                         example: "COUNT"
 *                       status:
 *                         type: boolean
 *                         example: true
 */
router.get(
  "/unit-options",
  unitOptionController.getAll.bind(unitOptionController)
);

/**
 * @swagger
 * /unit-options/seed-defaults:
 *   post:
 *     summary: Seed / Restore Default Unit Options
 *     description: Automatically insert any missing standard default unit options into the database.
 *     tags: [UnitOptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seed check performed successfully
 *       201:
 *         description: Missing default units seeded successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/unit-options/seed-defaults",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  unitOptionController.seedDefaults.bind(unitOptionController)
);


/**
 * @swagger
 * /unit-options/{id}:
 *   get:
 *     summary: Get Unit Option By ID
 *     description: Retrieve single unit option details by numeric ID.
 *     tags: [UnitOptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit Option ID
 *     responses:
 *       200:
 *         description: Unit option details found
 *       404:
 *         description: Unit option not found
 */
router.get(
  "/unit-options/:id",
  unitOptionController.getOne.bind(unitOptionController)
);

/**
 * @swagger
 * /unit-options/create:
 *   post:
 *     summary: Create Unit Option
 *     description: Add a new unit option into master registry.
 *     tags: [UnitOptions]
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
 *               - symbol
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Kilogram"
 *               symbol:
 *                 type: string
 *                 example: "kg"
 *               category:
 *                 type: string
 *                 enum: [COUNT, WEIGHT, VOLUME, LENGTH]
 *                 example: "WEIGHT"
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Unit option created successfully
 *       400:
 *         description: Unit option name or symbol already exists
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/unit-options/create",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  unitOptionController.create.bind(unitOptionController)
);

/**
 * @swagger
 * /unit-options/{id}:
 *   put:
 *     summary: Update Unit Option
 *     description: Modify name, symbol, category or status of an existing unit option.
 *     tags: [UnitOptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit Option ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gram"
 *               symbol:
 *                 type: string
 *                 example: "g"
 *               category:
 *                 type: string
 *                 enum: [COUNT, WEIGHT, VOLUME, LENGTH]
 *                 example: "WEIGHT"
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Unit option updated successfully
 *       404:
 *         description: Unit option not found
 */
router.put(
  "/unit-options/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  unitOptionController.update.bind(unitOptionController)
);

/**
 * @swagger
 * /unit-options/{id}/status:
 *   put:
 *     summary: Toggle Unit Option Active Status
 *     description: Activate or deactivate unit option availability.
 *     tags: [UnitOptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit Option ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Unit option not found
 */
router.put(
  "/unit-options/:id/status",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  unitOptionController.toggleStatus.bind(unitOptionController)
);

/**
 * @swagger
 * /unit-options/{id}:
 *   delete:
 *     summary: Delete Unit Option
 *     description: Permanently delete a unit option by ID.
 *     tags: [UnitOptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit Option ID
 *     responses:
 *       200:
 *         description: Unit option deleted successfully
 *       404:
 *         description: Unit option not found
 */
router.delete(
  "/unit-options/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  unitOptionController.delete.bind(unitOptionController)
);

export default router;
