import { Router } from "express";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { rolesController } from "../controllers";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create Role
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/roles",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  rolesController.create.bind(rolesController)
);

/**
 * @swagger
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get All Roles
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/roles",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  rolesController.getAll.bind(rolesController)
);

export default router;
