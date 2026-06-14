import { Router } from "express";
import { otpController } from "../controllers";
const router = Router();



 /**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to email or mobile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Email or mobile required
 */
router.post("/auth/send-otp", otpController.sendOtp.bind(otpController));


 /**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP (one-time use)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/auth/verify-otp", otpController.verifyOtp.bind(otpController));




export default router;