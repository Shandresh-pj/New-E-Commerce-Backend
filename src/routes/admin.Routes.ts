import { Router } from "express";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { adminController, authController } from "../controllers";

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
  adminController.assignRole.bind(adminController)
);

/**
 * @swagger
 * /auth/select-context:
 *   post:
 *     tags:
 *       - Super Admin
 *     summary: Select Company and Branch Context
 *     description: After login user selects company + branch + role to generate JWT
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
 *         description: JWT generated successfully
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
 *     summary: Select Company and Branch Context
 *     description: After login user selects company + branch + role to generate JWT
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
 *         description: JWT generated successfully
 */
router.delete(
  "/auth/removeUserAccess",
  adminController.removeUserAccess.bind(adminController)
);



export default router;