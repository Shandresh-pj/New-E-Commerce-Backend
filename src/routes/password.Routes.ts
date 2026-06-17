import { Router } from "express";
import { passwordController } from "../controllers";
import validate from "../middleware/validate";
import { ChangeMyPasswordDto } from "../dto";

const router = Router();

/**
 * @swagger
 * /password/send-otp:
 *   post:
 *     summary: Send OTP
 *     tags: [Password]
 */
router.post(
  "/password/send-otp",
  passwordController.sendOtp.bind(passwordController)
);

/**
 * @swagger
 * /password/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     tags: [Password]
 */
router.post(
  "/password/verify-otp",
  passwordController.verifyOtp.bind(passwordController)
);

/**
 * @swagger
 * /password/reset:
 *   post:
 *     summary: Reset Password
 *     tags: [Password]
 */
router.post(
  "/password/reset",
  passwordController.resetPassword.bind(passwordController)
);

/**
 * @swagger
 * /password/change:
 *   post:
 *     summary: Change Password
 *     description: Change the password for the currently authenticated user
 *     tags: [Password]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or current password incorrect
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/password/change",
  validate(ChangeMyPasswordDto),
  passwordController.changePassword.bind(passwordController)
);

export default router;