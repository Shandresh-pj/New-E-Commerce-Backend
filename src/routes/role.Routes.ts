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
 *     tags: [RoleAccess]
 *     summary: Create New System Role
 *     description: Define a new system role with custom permission scopes (Super Admin only).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - RoleName
 *             properties:
 *               RoleName:
 *                 type: string
 *                 example: "Inventory Auditor"
 *                 description: Name of the role (Required)
 *               Description:
 *                 type: string
 *                 example: "Can inspect stock logs and generate inventory audits"
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Role name already exists or invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin required
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
 *     tags: [RoleAccess]
 *     summary: Get All System Roles
 *     description: Retrieve list of all registered system roles and permissions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/roles",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  rolesController.getAll.bind(rolesController)
);

export default router;
