import { Router } from "express";
import { passwordController } from "../controllers";

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

export default router;