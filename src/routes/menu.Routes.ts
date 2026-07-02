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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 * /menus/update/{id}:
 *   put:
 *     tags: [Menus]
 *     summary: Update Menu
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/menus/delete/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("MENU"),
  menuController.delete.bind(menuController)
);

export default router;
