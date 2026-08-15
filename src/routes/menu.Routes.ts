import { Router } from "express";
import { menuController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Menus
 *   description: Dynamic application navigation menus and permission management
 */

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
 *         description: List of menus retrieved successfully
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
 *                         example: "Dashboard"
 *                       path:
 *                         type: string
 *                         example: "/dashboard"
 *                       icon:
 *                         type: string
 *                         example: "home-icon"
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 10
 *                             action:
 *                               type: string
 *                               example: "VIEW"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         example: 1
 *     responses:
 *       200:
 *         description: Menu details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Dashboard"
 *                     path:
 *                       type: string
 *                       example: "/dashboard"
 *                     icon:
 *                       type: string
 *                       example: "home-icon"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Menu not found
 *       500:
 *         description: Internal server error
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
 *                 description: "**REQUIRED** Menu title"
 *               path:
 *                 type: string
 *                 example: "/inventory"
 *                 description: "**REQUIRED** Angular/React route path"
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
 *         description: Menu created successfully
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
 *                   example: "Menu created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       500:
 *         description: Internal server error
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
 *                   example: "Successfully created 2 menus"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         example: 1
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
 *                   example: "Menu updated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Menu not found
 *       500:
 *         description: Internal server error
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
 *         example: 1
 *     responses:
 *       200:
 *         description: Menu deleted successfully
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
 *                   example: "Menu deleted"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Menu not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/menus/delete/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.delete.bind(menuController)
);

export default router;
