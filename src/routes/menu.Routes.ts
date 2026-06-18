import { Router } from "express";
import { menuController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /menus:
 *   get:
 *     tags:
 *       - Menus
 *     summary: Get Menus with Permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/menus",
  menuController.getAll.bind(menuController)
);

/**
 * @swagger
 * /menus:
 *   post:
 *     tags:
 *       - Menus
 *     summary: Create Menu + Auto Permissions
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
 *               path:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/menus",
  menuController.create.bind(menuController)
);
/**
 * @swagger
 * /menus/update/{id}:
 *   post:
 *     tags:
 *       - Menus
 *     summary: Create Menu + Auto Permissions
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
 *               path:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/menus/update/:id",
  menuController.update.bind(menuController)
);

/**
 * @swagger
 * /menus/delete/{id}:
 *   post:
 *     tags:
 *       - Menus
 *     summary: delete the menu
 */
router.post(
  "/menus/delete/:id",
  menuController.remove.bind(menuController)
);



/**
 * @swagger
 * /permissions:
 *   get:
 *     tags:
 *       - Menus
 *     summary: Get All Permissions
 */
router.get(
  "/permissions",
  menuController.getAllPermissions.bind(menuController)
);

export default router;