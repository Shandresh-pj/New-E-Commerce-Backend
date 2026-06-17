import { Router } from "express";
import authenticateMiddleware from "../middleware/authenticate";
import { rolesController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create Role
 *     description: Create system role (SuperAdmin only)
 */
router.post(
  "/roles",
  authenticateMiddleware,
  rolesController.create.bind(rolesController)
);

/**
 * @swagger
 * /roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get All Roles
 */
router.get(
  "/roles",
  authenticateMiddleware,
  rolesController.getAll.bind(rolesController)
);

export default router;