import { Router } from "express";
import { menuController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /menus:
 *   get:
 *     tags: [Menus]
 *     summary: Get Menus with Permissions
 *     description: Retrieve all navigation menu items and user permission matrix.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of menus retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/menus",
  authenticateMiddleware,
  authorize(),
  menuController.getAll.bind(menuController)
);

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     tags: [Menus]
 *     summary: Get Menu by ID
 *     description: Retrieve menu item details by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu details
 *       404:
 *         description: Menu not found
 */
router.get(
  "/menus/:id",
  authenticateMiddleware,
  authorize(),
  menuController.getOne.bind(menuController)
);

/**
 * @swagger
 * /menus:
 *   post:
 *     tags: [Menus]
 *     summary: Create Menu + Auto Permissions
 *     description: Add a new navigation menu item (Super Admin only).
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
 *               - path
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Inventory Control"
 *               path:
 *                 type: string
 *                 example: "/inventory"
 *               icon:
 *                 type: string
 *                 example: "box-icon"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *               sort_order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Menu created
 *       400:
 *         description: Missing required fields
 */
router.post(
  "/menus",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.create.bind(menuController)
);

/**
 * @swagger
 * /menus/bulk:
 *   post:
 *     tags: [Menus]
 *     summary: Create Menus in Bulk
 *     description: Create multiple navigation menu items in one operation.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menus
 *             properties:
 *               menus:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - path
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Reports"
 *                     path:
 *                       type: string
 *                       example: "/reports"
 *                     icon:
 *                       type: string
 *                       example: "chart-icon"
 *     responses:
 *       201:
 *         description: Menus created successfully
 */
router.post(
  "/menus/bulk",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.createBulk.bind(menuController)
);

/**
 * @swagger
 * /menus/update/{id}:
 *   put:
 *     tags: [Menus]
 *     summary: Update Menu
 *     description: Update navigation menu details.
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
 *               name:
 *                 type: string
 *                 example: "Updated Menu Title"
 *               path:
 *                 type: string
 *                 example: "/updated-path"
 *               icon:
 *                 type: string
 *                 example: "new-icon"
 *               sort_order:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Menu updated successfully
 *       404:
 *         description: Menu not found
 */
router.put(
  "/menus/update/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.update.bind(menuController)
);

/**
 * @swagger
 * /menus/delete/{id}:
 *   delete:
 *     tags: [Menus]
 *     summary: Delete Menu
 *     description: Remove a navigation menu item by ID.
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
 *         description: Menu deleted successfully
 *       404:
 *         description: Menu not found
 */
router.delete(
  "/menus/delete/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.delete.bind(menuController)
);

export default router;
