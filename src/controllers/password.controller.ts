import bcrypt from "bcrypt";

import {
  Controller,
  Post,
  Middleware,
  Swagger
} from "../decorators";

import validate from "../middleware/validate";
import authenticateMiddleware from "../middleware/authenticate";

import { dataSource } from "../server";

import { User } from "../entities/user";
import { PasswordReset } from "../entities/password-reset.entity";

import {
  VerifyPasswordOtpDto,
  ResetPasswordDto,
  ChangePasswordDto
} from "../dto";

import { OtpService } from "../services/otp.service";
import { EmailService } from "../utils/sendEmailOtp";

import {
  SendPasswordOtpDto,
  ChangeMyPasswordDto
} from "../dto";

@Controller("/password")
export class PasswordController {

  /**
   * SEND OTP
   */
  @Post("/send-otp")
  @Middleware([
    validate(SendPasswordOtpDto)
  ])
  @Swagger(
    "Send OTP",
    "Send OTP to email"
  )
  public async sendOtp(
    req: any,
    res: any
  ) {

    try {

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
        verified: false,
        attempts: 0,
        expires_at: new Date(
          Date.now() +
          5 * 60 * 1000
        )
      });

      await EmailService.sendOtp(
        email,
        otp
      );

      return res.status(200).json({
        success: true,
        message:
          "OTP sent successfully"
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * VERIFY OTP
   */
  @Post("/verify-otp")
  @Middleware([
    validate(VerifyPasswordOtpDto)
  ])
  @Swagger(
    "Verify OTP",
    "Verify password OTP"
  )
  public async verifyOtp(
    req: any,
    res: any
  ) {

    try {

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
          success: false,
          message: "User not found"
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
          success: false,
          message: "OTP not found"
        });
      }

      if (
        new Date() >
        record.expires_at
      ) {

        await otpRepo.delete({
          id: record.id
        });

        return res.status(400).json({
          success: false,
          message: "OTP expired"
        });
      }

      if (
        record.attempts >= 5
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Maximum OTP attempts exceeded"
        });
      }

      const valid =
        await bcrypt.compare(
          otp,
          record.otp
        );

      if (!valid) {

        record.attempts += 1;

        await otpRepo.save(
          record
        );

        return res.status(400).json({
          success: false,
          message: "Invalid OTP"
        });
      }

      record.verified = true;

      await otpRepo.save(
        record
      );

      return res.status(200).json({
        success: true,
        message:
          "OTP verified successfully"
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * FORGOT PASSWORD RESET
   */
  @Post("/reset-password")
  @Middleware([
    validate(ResetPasswordDto)
  ])
  @Swagger(
    "Reset Password",
    "Reset password after OTP verification"
  )
  public async resetPassword(
    req: any,
    res: any
  ) {

    try {

      const {
        email,
        newPassword,
        confirmPassword
      } = req.body;

      if (
        newPassword !==
        confirmPassword
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Passwords do not match"
        });
      }

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
          message:
            "User not found"
        });
      }

      const otpRecord =
        await otpRepo.findOne({
          where: {
            user_id: user.id,
            verified: true
          }
        });

      if (!otpRecord) {

        return res.status(400).json({
          success: false,
          message:
            "OTP verification required"
        });
      }

      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password
        );

      if (samePassword) {

        return res.status(400).json({
          success: false,
          message:
            "New password must be different from current password"
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.mustChangePassword =
        false;

      await userRepo.save(
        user
      );

      await otpRepo.delete({
        id: otpRecord.id
      });

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully"
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * CHANGE PASSWORD
   * (Logged-in User)
   */
  @Post("/change-password")
  @Middleware([
    authenticateMiddleware,
    validate(ChangePasswordDto)
  ])
  @Swagger(
    "Change Password",
    "Change current password"
  )
  public async changePassword(
    req: any,
    res: any
  ) {

    try {

      const {
        currentPassword,
        newPassword,
        confirmPassword
      } = req.body;

      if (
        newPassword !==
        confirmPassword
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Passwords do not match"
        });
      }

      const userRepo =
        dataSource.getRepository(User);

      const user =
        await userRepo.findOne({
          where: {
            id: req.user.user_id
          }
        });

      if (!user) {

        return res.status(404).json({
          success: false,
          message:
            "User not found"
        });
      }

      const validPassword =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!validPassword) {

        return res.status(400).json({
          success: false,
          message:
            "Current password is incorrect"
        });
      }

      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password
        );

      if (samePassword) {

        return res.status(400).json({
          success: false,
          message:
            "New password cannot be same as current password"
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.mustChangePassword =
        false;

      await userRepo.save(
        user
      );

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully"
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }



  @Post("/change-temporary-password")
@Swagger(
  "Change Temporary Password",
  "First login password change"
)
public async changeTemporaryPassword(
  req: any,
  res: any
) {
  try {

    const {
      email,
      password,
      confirmPassword
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const userRepo =
      dataSource.getRepository(User);

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

    user.password =
      await bcrypt.hash(
        password,
        12
      );

    user.mustChangePassword = false;

    await userRepo.save(user);

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully"
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
}