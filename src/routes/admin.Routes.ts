import { Router } from "express";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { adminController, authController } from "../controllers";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * =====================================================
 * SUPER ADMIN RBAC
 * =====================================================
 */

/**
 * @swagger
 * /auth/user-access/{userId}:
 *   get:
 *     tags:
 *       - Super Admin
 *     summary: Get User Access
 *     description: Get all company/branch/role access for a user (Superadmin or self only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: User access fetched successfully
 *       403:
 *         description: Forbidden
 */
router.get(
  "/auth/user-access/:userId",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  adminController.getUserAccess.bind(adminController)
);

/**
 * @swagger
 * /auth/assign-role:
 *   post:
 *     tags:
 *       - Super Admin
 *     summary: Assign Role to User
 *     description: Only Superadmin can assign roles across company and branch
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - companyId
 *               - roleId
 *             properties:
 *               userId:
 *                 type: number
 *               companyId:
 *                 type: number
 *               branchId:
 *                 type: number
 *               roleId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       403:
 *         description: Only Superadmin allowed
 */
router.post(
  "/auth/assign-role",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  adminController.assignRole.bind(adminController)
);

/**
 * @swagger
 * /auth/select-context:
 *   post:
 *     tags:
 *       - Super Admin
 *     summary: Select Company & Branch Context
 *     description: >  
 *       After initial login (no company context), the user selects which company,
 *       branch and role to operate under. A scoped JWT token is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - companyId
 *               - roleId
 *             properties:
 *               userId:
 *                 type: number
 *                 example: 1
 *                 description: "**REQUIRED** User ID"
 *               companyId:
 *                 type: number
 *                 example: 1
 *                 description: "**REQUIRED** Company ID to switch context to"
 *               branchId:
 *                 type: number
 *                 example: 2
 *                 description: Optional branch ID (required for branch-scoped roles)
 *               roleId:
 *                 type: number
 *                 example: 3
 *                 description: "**REQUIRED** Role ID to assume"
 *     responses:
 *       200:
 *         description: Scoped JWT token returned
 *       403:
 *         description: User does not have access to this company/branch/role combination
 */
router.post(
  "/auth/select-context",
  adminController.selectContext.bind(adminController)
);



/**
 * @swagger
 * /auth/removeUserAccess:
 *   delete:
 *     tags:
 *       - Super Admin
 *     summary: Remove User Access
 *     description: >  
 *       Revokes a user's access to a specific company/branch/role combination.
 *       The user will no longer be able to log into that context.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - companyId
 *               - roleId
 *             properties:
 *               userId:
 *                 type: number
 *                 example: 42
 *                 description: "**REQUIRED** User ID to revoke access from"
 *               companyId:
 *                 type: number
 *                 example: 1
 *                 description: "**REQUIRED** Company ID"
 *               branchId:
 *                 type: number
 *                 example: 2
 *                 description: Optional branch ID (if access is branch-scoped)
 *               roleId:
 *                 type: number
 *                 example: 3
 *                 description: "**REQUIRED** Role ID to revoke"
 *     responses:
 *       200:
 *         description: User access revoked successfully
 *       403:
 *         description: Only Superadmin can revoke access
 *       404:
 *         description: User access record not found
 */
router.delete(
  "/auth/removeUserAccess",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditMiddleware("ADMIN"),
  adminController.removeUserAccess.bind(adminController)
);



export default router;