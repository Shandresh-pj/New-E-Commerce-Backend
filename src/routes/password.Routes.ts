import { Router } from "express";
import { authController, passwordController } from "../controllers";

const router = Router();


/**
 * @swagger
 * /password/send-otp:
 *   post:
 *     tags:
 *       - Password
 *     summary: Send OTP
 *     description: Send OTP to registered email for password reset
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
 *         description: OTP sent successfully
 *       404:
 *         description: User not found
 */
router.post(
  "/password/send-otp",
  passwordController.sendOtp.bind(
    passwordController
  )
);

/**
 * @swagger
 * /password/verify-otp:
 *   post:
 *     tags:
 *       - Password
 *     summary: Verify OTP
 *     description: Verify OTP sent to email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post(
  "/password/verify-otp",
  passwordController.verifyOtp.bind(
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
 *     description: Reset password after successful OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               newPassword:
 *                 type: string
 *                 example: Admin@123
 *               confirmPassword:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: OTP verification required
 */
router.post(
  "/password/reset-password",
  passwordController.resetPassword.bind(
    passwordController
  )
);


/**
 * @swagger
 * /auth/change-temporary-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Change Temporary Password
 *     description: First login password change for Super Admin, Admin, Branch Manager, Employee and Customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post(
  "/auth/change-temporary-password",
  passwordController.changeTemporaryPassword.bind(
    passwordController
  )
);

export default router;