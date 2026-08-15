import { Router } from "express";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { rolesController } from "../controllers";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: RoleAccess
 *   description: System role and permission management
 */

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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Inventory Auditor"
 *                 description: "**REQUIRED** Name of the role"
 *               RoleName:
 *                 type: string
 *                 example: "Inventory Auditor"
 *                 description: Backward-compatible role name alias
 *               Description:
 *                 type: string
 *                 example: "Can inspect stock logs and generate inventory audits"
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: "Inventory Auditor"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Role name already exists or invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin required
 *       409:
 *         description: Role already exists
 *       500:
 *         description: Internal server error
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
 *         description: List of roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 6
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
 *                         example: "SUPER_ADMIN"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/roles",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  rolesController.getAll.bind(rolesController)
);

export default router;
