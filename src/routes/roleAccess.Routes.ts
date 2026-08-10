import { Router } from "express";
import { roleAccessController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];

/**
 * @swagger
 * /role-access:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Assign Permission to Role
 *     description: >
 *       Grants a specific menu/action permission to a role at company or branch scope.
 *       Use this to build fine-grained RBAC policies.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - menu
 *               - action
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 3
 *                 description: "**REQUIRED** Role ID to grant permission to"
 *               menu:
 *                 type: string
 *                 example: Products
 *                 description: "**REQUIRED** Menu/module name (e.g. Products, Orders, Payroll)"
 *               action:
 *                 type: string
 *                 enum: [READ, CREATE, UPDATE, DELETE, APPROVE, EXPORT]
 *                 example: READ
 *                 description: "**REQUIRED** Action permission type"
 *               scope:
 *                 type: string
 *                 enum: [COMPANY, BRANCH, EMPLOYEE]
 *                 example: BRANCH
 *                 description: Optional scope level (defaults to COMPANY)
 *               branch_id:
 *                 type: integer
 *                 example: 2
 *                 description: Optional branch ID (required if scope is BRANCH)
 *               is_allowed:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the permission is allowed (default true)
 *     responses:
 *       201:
 *         description: Permission assigned successfully
 *       400:
 *         description: Duplicate permission or validation error
 *       403:
 *         description: Forbidden — Admin role required
 */
router.post(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.create.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/batch:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Batch Assign Permissions
 *     description: >
 *       Assigns or syncs multiple permissions for a role in a single request.
 *       Existing permissions that are not in the batch will be removed (full sync).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permissions
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 3
 *                 description: "**REQUIRED** Role ID to update permissions for"
 *               permissions:
 *                 type: array
 *                 description: "**REQUIRED** Array of permission objects"
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu:
 *                       type: string
 *                       example: Products
 *                     action:
 *                       type: string
 *                       enum: [READ, CREATE, UPDATE, DELETE, APPROVE, EXPORT]
 *                       example: CREATE
 *                     is_allowed:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Permissions batch updated
 */
router.post(
  "/role-access/batch",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/batch:
 *   put:
 *     tags:
 *       - Role Access
 *     summary: Batch Update Permissions (PUT alias)
 *     description: PUT alias for the batch permission sync endpoint.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permissions
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 3
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu:
 *                       type: string
 *                     action:
 *                       type: string
 *                     is_allowed:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.put(
  "/role-access/batch",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/sync:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Sync Role Permissions (Full Replacement)
 *     description: >
 *       Completely replaces all permissions for a role with the provided set.
 *       Any permissions not in the new list will be deleted.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permissions
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 3
 *                 description: "**REQUIRED** Role ID to sync"
 *               permissions:
 *                 type: array
 *                 description: "**REQUIRED** Complete new permission set"
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu:
 *                       type: string
 *                       example: Payroll
 *                     action:
 *                       type: string
 *                       example: APPROVE
 *                     is_allowed:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Permissions synced successfully
 */
router.post(
  "/role-access/sync",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get All Role Permissions
 *     description: Returns all role permission records for the active company.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Filter by role ID
 *       - in: query
 *         name: menu
 *         schema:
 *           type: string
 *           example: Products
 *         description: Filter by menu/module name
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [READ, CREATE, UPDATE, DELETE, APPROVE, EXPORT]
 *         description: Filter by action type
 *     responses:
 *       200:
 *         description: Permission list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.getAll.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/role/{role_id}:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get Permissions by Role ID
 *     description: Returns all menu/action permissions assigned to a specific role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Role ID to fetch permissions for
 *     responses:
 *       200:
 *         description: Role permissions retrieved
 *       404:
 *         description: Role not found
 */
router.get(
  "/role-access/role/:role_id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.getByRole.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/{id}:
 *   put:
 *     tags:
 *       - Role Access
 *     summary: Update Single Permission
 *     description: Update `is_allowed` or `action` for an existing role permission record.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 25
 *         description: Permission record ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_allowed:
 *                 type: boolean
 *                 example: false
 *                 description: Enable or disable the permission
 *               action:
 *                 type: string
 *                 enum: [READ, CREATE, UPDATE, DELETE, APPROVE, EXPORT]
 *                 example: UPDATE
 *     responses:
 *       200:
 *         description: Permission updated
 *       404:
 *         description: Permission record not found
 */
router.put(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.update.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/{id}/approve:
 *   put:
 *     tags:
 *       - Role Access
 *     summary: Approve Role Permission
 *     description: Marks a role permission as approved by a super admin, activating it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 25
 *         description: Permission record ID to approve
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Permission approved and activated
 *       403:
 *         description: Super Admin only
 *       404:
 *         description: Permission not found
 */
router.put(
  "/role-access/:id/approve",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.approve.bind(roleAccessController)
);

/**
 * @swagger
 * /role-access/{id}:
 *   delete:
 *     tags:
 *       - Role Access
 *     summary: Delete Role Permission
 *     description: Permanently removes a permission assignment from a role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 25
 *         description: Permission record ID to delete
 *     responses:
 *       200:
 *         description: Permission deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Permission not found
 */
router.delete(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.delete.bind(roleAccessController)
);

export default router;