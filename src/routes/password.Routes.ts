import { Router } from "express";
import { passwordController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();


/**
 * @swagger
 * /password/forgot-password:
 *   post:
 *     tags:
 *       - Password
 *     summary: Forgot Password
 *     description: Generate a password reset token and send via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *     responses:
 *       200:
 *         description: Reset link sent
 */
router.post(
  "/password/forgot-password",
  passwordController.forgotPassword.bind(
    passwordController
  )
);

/**
 * @swagger
 * /password/reset-password:
 *   post:
 *     tags:
 *       - Password
 *     summary: Reset Password
 *     description: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post(
  "/password/reset-password",
  passwordController.resetPassword.bind(
    passwordController
  )
);

/**
 * @swagger
 * /password/change-password:
 *   post:
 *     tags:
 *       - Password
 *     summary: Change User Password (Admin Only)
 *     description: Admin or Superadmin overrides another user's password directly (no old password required).
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
 *               - newPassword
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 42
 *                 description: "**REQUIRED** ID of the user whose password is being changed"
 *               newPassword:
 *                 type: string
 *                 example: "NewPass@2026"
 *                 description: "**REQUIRED** New password (min 8 chars, must include uppercase, number, and symbol)"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       403:
 *         description: Not authorized to change this user's password
 *       404:
 *         description: User not found
 */
router.post(
  "/password/change-password",
  authenticateMiddleware,
  passwordController.changePassword.bind(
    passwordController
  )
);

/**
 * @swagger
 * /password/change-my-password:
 *   post:
 *     tags:
 *       - Password
 *     summary: Change My Own Password
 *     description: Allows a logged-in user to change their own password by providing the current password first.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "OldPass@123"
 *                 description: "**REQUIRED** Current password for verification"
 *               newPassword:
 *                 type: string
 *                 example: "NewPass@2026"
 *                 description: "**REQUIRED** New password (min 8 chars)"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPass@2026"
 *                 description: Optional — must match newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Old password is incorrect
 *       422:
 *         description: New passwords do not match
 */
router.post(
  "/password/change-my-password",
  authenticateMiddleware,
  passwordController.changeMyPassword.bind(
    passwordController
  )
);

export default router;