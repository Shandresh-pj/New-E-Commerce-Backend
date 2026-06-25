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
 * /menus/{id}:
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
  "/menus/:id",
  menuController.getOne.bind(menuController)
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
 *   put:
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
router.put(
  "/menus/update/:id",
  menuController.update.bind(menuController)
);

/**
 * @swagger
 * /menus/delete/{id}:
 *   delete:
 *     tags:
 *       - Menus
 *     summary: delete the menu
 */
router.delete(
  "/menus/delete/:id",
  menuController.delete.bind(menuController)
);



export default router;