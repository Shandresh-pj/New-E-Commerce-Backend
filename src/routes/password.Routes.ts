import { Router } from "express";
import { passwordController } from "../controllers";

const router = Router();


/**
 * @swagger
 * tags:
 *   name: Password
 *   description: Password Management APIs
 */

/**
 * @swagger
 * /password/forgot-password:
 *   post:
 *     tags:
 *       - Password
 *     summary: Forgot Password
 *     description: Send OTP to registered email for password reset.
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
 *                 example: company@gmail.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: User not found
 */
router.post(
  "/password/forgot-password",
  passwordController.forgotPassword.bind(
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
 *     description: Verify OTP sent to email.
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
 *                 example: company@gmail.com
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
 *     description: Reset password after OTP verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: company@gmail.com
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
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

export default router;