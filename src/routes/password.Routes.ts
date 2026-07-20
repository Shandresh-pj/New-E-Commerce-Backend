import { Router } from "express";
import { passwordController } from "../controllers";

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
 *     summary: Change Password (Admin)
 *     description: Admin changes another user's password
 */
router.post(
  "/password/change-password",
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
 *     summary: Change My Password
 *     description: User changes their own password
 */
router.post(
  "/password/change-my-password",
  passwordController.changeMyPassword.bind(
    passwordController
  )
);

export default router;