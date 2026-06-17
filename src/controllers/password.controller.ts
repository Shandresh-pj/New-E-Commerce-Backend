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

import {
  SendPasswordOtpDto,
  VerifyPasswordOtpDto,
  ResetPasswordDto
} from "../dto";
import { User } from "../entities/user";
import { OtpService } from "../services/otp.service";
import { EmailService } from "../utils/sendEmailOtp";

@Controller("/password")
export class PasswordController {

  // ==========================================
  // SEND OTP
  // ==========================================
@Post("/forgot-password")
@Middleware([
  validate(SendPasswordOtpDto)
])
@Swagger(
  "Forgot Password",
  "Send OTP"
)
public async forgotPassword(
  req: any,
  res: any
) {

  const { email } = req.body;

  const userRepo =
    dataSource.getRepository(User);

  const otpRepo =
    dataSource.getRepository(
      PasswordReset
    );

  const user =
    await userRepo.findOne({
      where: { email }
    });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const otp =
    OtpService.generate();

  const hashedOtp =
    await bcrypt.hash(
      otp,
      10
    );

  await otpRepo.delete({
    user_id: user.id
  });

  await otpRepo.save({
    user_id: user.id,
    otp: hashedOtp,
    expires_at:
      new Date(
        Date.now() + 5 * 60 * 1000
      )
  });

  await EmailService.sendOtp(
    user.email,
    otp
  );

  return res.json({
    success: true,
    message:
      "OTP sent successfully"
  });
}

  // ==========================================
  // VERIFY OTP
  // ==========================================
@Post("/verify-otp")
public async verifyOtp(
  req: any,
  res: any
) {

  const {
    email,
    otp
  } = req.body;

  const userRepo =
    dataSource.getRepository(User);

  const otpRepo =
    dataSource.getRepository(
      PasswordReset
    );

  const user =
    await userRepo.findOne({
      where: { email }
    });

  if (!user) {
    return res.status(404).json({
      success: false
    });
  }

  const record =
    await otpRepo.findOne({
      where: {
        user_id: user.id
      }
    });

  if (!record) {
    return res.status(400).json({
      message: "OTP not found"
    });
  }

  if (
    new Date() >
    record.expires_at
  ) {
    return res.status(400).json({
      message: "OTP expired"
    });
  }

  const valid =
    await bcrypt.compare(
      otp,
      record.otp
    );

  if (!valid) {
    return res.status(400).json({
      message: "Invalid OTP"
    });
  }

  record.verified = true;

  await otpRepo.save(record);

  return res.json({
    success: true,
    message:
      "OTP verified"
  });
}

  // ==========================================
  // RESET PASSWORD
  // ==========================================
  @Post("/reset-password")
public async resetPassword(
  req: any,
  res: any
) {

  const {
    email,
    newPassword
  } = req.body;

  const userRepo =
    dataSource.getRepository(User);

  const otpRepo =
    dataSource.getRepository(
      PasswordReset
    );

  const user =
    await userRepo.findOne({
      where: { email }
    });

  const record =
    await otpRepo.findOne({
      where: {
        user_id: user?.id,
        verified: true
      }
    });

  if (!record) {
    return res.status(400).json({
      message:
      "OTP verification required"
    });
  }

  user!.password =
    await bcrypt.hash(
      newPassword,
      10
    );

  await userRepo.save(user!);

  await otpRepo.delete({
    id: record.id
  });

  return res.json({
    success: true,
    message:
      "Password updated"
  });
}
}