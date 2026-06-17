import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response } from "express";

import {
  Controller,
  Post,
  Swagger,
  Middleware
} from "../decorators";

import validate from "../middleware/validate";
import { dataSource } from "../server";

import { Register } from "../entities/register";
import { PasswordReset } from "../entities/password-reset.entity";
import sendEmailOtp from "../utils/sendEmailOtp";

import {
  SendPasswordOtpDto,
  VerifyPasswordOtpDto,
  ResetPasswordDto,
  ChangeMyPasswordDto
} from "../dto";

@Controller("/password")
export class PasswordController {

  // ==========================================
  // OTP GENERATOR
  // ==========================================
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ==========================================
  // SEND OTP
  // ==========================================
  @Post("/send-otp")
  @Middleware([validate(SendPasswordOtpDto)])
  @Swagger("Send OTP", "Send OTP for password reset")
  async sendOtp(req: Request, res: Response) {

    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const userRepo = dataSource.getRepository(Register);
    const otpRepo = dataSource.getRepository(PasswordReset);

    const user = await userRepo.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = this.generateOtp();
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // remove old OTPs
    await otpRepo.delete({
      user: { id: user.id }
    });

    const record = otpRepo.create({
      user: user, // 🔥 RELATION MAPPING
      otp,
      reset_token: resetToken,
      expires_at: expiresAt,
      verified: false
    });

    await otpRepo.save(record);

    await sendEmailOtp(email, otp);

    return res.json({
      success: true,
      message: "OTP sent successfully"
    });
  }

  // ==========================================
  // VERIFY OTP
  // ==========================================
  @Post("/verify-otp")
  @Middleware([validate(VerifyPasswordOtpDto)])
  @Swagger("Verify OTP", "Verify password reset OTP")
  async verifyOtp(req: Request, res: Response) {

    const { email, otp } = req.body || {};

    const otpRepo = dataSource.getRepository(PasswordReset);

    const record = await otpRepo.findOne({
      where: {
        otp,
        user: { email },
        verified: false
      },
      relations: {user : true}
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (new Date(record.expires_at!) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    record.verified = true;
    await otpRepo.save(record);

    return res.json({
      success: true,
      message: "OTP verified successfully",
      reset_token: record.reset_token
    });
  }

  // ==========================================
  // RESET PASSWORD
  // ==========================================
  @Post("/reset")
  @Middleware([validate(ResetPasswordDto)])
  @Swagger("Reset Password", "Reset password using OTP flow")
  async resetPassword(req: Request, res: Response) {

    const { reset_token, newPassword } = req.body || {};

    const userRepo = dataSource.getRepository(Register);
    const otpRepo = dataSource.getRepository(PasswordReset);

    const record = await otpRepo.findOne({
      where: {
        reset_token,
        verified: true
      },
      relations: {user : true}
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token"
      });
    }

    if (new Date(record.expires_at!) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    const user = record.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // update password
    user.password = await bcrypt.hash(newPassword, 10);
    await userRepo.save(user);

    // cleanup OTP record
    await otpRepo.delete({
      reset_token
    });

    return res.json({
      success: true,
      message: "Password reset successful"
    });
  }

  // ==========================================
  // CHANGE PASSWORD (authenticated user)
  // ==========================================
  @Post("/change")
  @Middleware([validate(ChangeMyPasswordDto)])
  @Swagger("Change Password", "Change password for the logged-in user")
  async changePassword(req: any, res: Response) {

    const { currentPassword, newPassword } = req.body || {};

    const userRepo = dataSource.getRepository(Register);

    const user = await userRepo.findOne({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password login is not available for this account"
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