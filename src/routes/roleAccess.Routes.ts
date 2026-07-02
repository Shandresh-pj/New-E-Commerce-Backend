import { Router } from "express";

import {
  roleAccessController
} from "../controllers";

import authenticateMiddleware
from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();


// =======================================
// CREATE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Assign permission to role at a scope (admin / branch / employee)
 *     description: >
 *       Scope is set by which ids are given —
 *       none = global, company_id = admin level,
 *       company_id + branch_id = branch level,
 *       company_id + branch_id + user_id = employee level.
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
 *               - permission_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 1
 *               permission_id:
 *                 type: integer
 *                 example: 5
 *               company_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               branch_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *               user_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 7
 *               canApprove:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Permission assigned successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Permission already exists
 *       500:
 *         description: Server error
 */

router.post(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.create.bind(
    roleAccessController
  )
);


// =======================================
// UPDATE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access/{id}:
 *   put:
 *     tags:
 *       - Role Access
 *     summary: Update role permission mapping
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permission_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 2
 *               permission_id:
 *                 type: integer
 *                 example: 8
 *               company_id:
 *                 type: integer
 *                 nullable: true
 *               branch_id:
 *                 type: integer
 *                 nullable: true
 *               user_id:
 *                 type: integer
 *                 nullable: true
 *               canApprove:
 *                 type: boolean
 *
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Record not found
 *       409:
 *         description: Duplicate mapping
 */

router.put(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.update.bind(
    roleAccessController
  )
);


// =======================================
// GET ALL ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get all role permissions (filterable by scope)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: menu_id
 *         schema: { type: integer }
 *       - in: query
 *         name: role_id
 *         schema: { type: integer }
 *       - in: query
 *         name: company_id
 *         schema: { type: integer }
 *       - in: query
 *         name: branch_id
 *         schema: { type: integer }
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [global, admin, branch, employee]
 *     responses:
 *       200:
 *         description: List of permissions
 */

router.get(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.getAll.bind(
    roleAccessController
  )
);


// =======================================
// GET BY ROLE
// =======================================

/**
 * @swagger
 * /role-access/role/{role_id}:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get permissions by role id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Role permissions list
 */

router.get(
  "/role-access/role/:role_id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.getByRole.bind(
    roleAccessController
  )
);


// =======================================
// DELETE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access/{id}:
 *   delete:
 *     tags:
 *       - Role Access
 *     summary: Remove permission from role
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *
 *       404:
 *         description: Record not found
 */

router.delete(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.delete.bind(
    roleAccessController
  )
);


// =======================================
// APPROVE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access/{id}/approve:
 *   put:
 *     tags:
 *       - Role Access
 *     summary: Approve role access mapping
 *     description: Only SUPER_ADMIN and ADMIN can approve pending role access
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *
 *     responses:
 *       200:
 *         description: Role access approved successfully
 *
 *       403:
 *         description: Permission denied
 *
 *       404:
 *         description: Record not found
 *
 *       500:
 *         description: Internal server error
 */

router.put(
  "/role-access/:id/approve",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  roleAccessController.approve.bind(
    roleAccessController
  )
);

export default router;