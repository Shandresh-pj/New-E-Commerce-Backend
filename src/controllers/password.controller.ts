import bcrypt from "bcrypt";
import { Request, Response } from "express";

import {
  Controller,
  Post,
  Swagger,
  Middleware
} from "../decorators";

import validate from "../middleware/validate";
import { dataSource } from "../server";

import { PasswordReset } from "../entities/password-reset.entity";
import { User } from "../entities/user";
import { OtpService } from "../services/otp.service";
import { EmailService } from "../utils/sendEmailOtp";

import {
  SendPasswordOtpDto,
  ChangeMyPasswordDto
} from "../dto";

@Controller("/password")
export class PasswordController {

  // ==========================================
  // SEND OTP
  // ==========================================
  @Post("/forgot-password")
  @Middleware([validate(SendPasswordOtpDto)])
  @Swagger("Forgot Password", "Send OTP")
  public async forgotPassword(req: Request, res: Response) {

    const { email } = req.body;

    const userRepo = dataSource.getRepository(User);
    const otpRepo = dataSource.getRepository(PasswordReset);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = OtpService.generate();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await otpRepo.delete({ user_id: user.id });

    await otpRepo.save({
      user_id: user.id,
      otp: hashedOtp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    await EmailService.sendOtp(user.email, otp);

    return res.json({
      success: true,
      message: "OTP sent successfully"
    });
  }

  // ==========================================
  // VERIFY OTP
  // ==========================================
  @Post("/verify-otp")
  public async verifyOtp(req: Request, res: Response) {

    const { email, otp } = req.body;

    const userRepo = dataSource.getRepository(User);
    const otpRepo = dataSource.getRepository(PasswordReset);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false });
    }

    const record = await otpRepo.findOne({
      where: { user_id: user.id }
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (new Date() > record.expires_at) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const valid = await bcrypt.compare(otp, record.otp);

    if (!valid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.verified = true;

    await otpRepo.save(record);

    return res.json({
      success: true,
      message: "OTP verified"
    });
  }

  // ==========================================
  // RESET PASSWORD
  // ==========================================
  @Post("/reset-password")
  public async resetPassword(req: Request, res: Response) {

    const { email, newPassword } = req.body;

    const userRepo = dataSource.getRepository(User);
    const otpRepo = dataSource.getRepository(PasswordReset);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const record = await otpRepo.findOne({
      where: {
        user_id: user.id,
        verified: true
      }
    });

    if (!record) {
      return res.status(400).json({
        message: "OTP verification required"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await userRepo.save(user);

    await otpRepo.delete({ id: record.id });

    return res.json({
      success: true,
      message: "Password updated"
    });
  }

  // ==========================================
  // CHANGE PASSWORD (authenticated user)
  // ==========================================
  @Post("/change")
  @Middleware([validate(ChangeMyPasswordDto)])
  @Swagger("Change Password", "Change password for the logged-in user")
  public async changePassword(req: any, res: Response) {

    const { currentPassword, newPassword } = req.body || {};

    const userRepo = dataSource.getRepository(User);
    const userId = req.user?.id ?? req.user?.user_id;

    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await userRepo.save(user);

    return res.json({
      success: true,
      message: "Password changed successfully"
    });
  }
}
