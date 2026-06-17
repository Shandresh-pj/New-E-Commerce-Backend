import { Router } from "express";
import { roleAccessController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate";

const router = Router();

/**
 * @swagger
 * /role-access/create:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Create Role Permission
 */
router.post(
  "/role-access/create",
  authenticateMiddleware,
  roleAccessController.create.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get Role Permissions
 */
router.get(
  "/role-access",
  authenticateMiddleware,
  roleAccessController.getAll.bind(roleAccessController)
);

export default router;