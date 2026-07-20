import bcrypt from "bcrypt";
import crypto from "crypto";

import {
    Controller,
    Post,
    Middleware,
    Swagger
} from "../decorators";

import validate from "../middleware/validate";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { User } from "../entities/user";
import { EmailService } from "../utils/sendEmailOtp";
import { Request, Response } from "express";

import { ChangePasswordDto, ChangeMyPasswordDto } from "../dto";

@Controller("/password")
export class PasswordController {

  @Post("/forgot-password")
  @Swagger("Forgot Password", "Generate a password reset token and send via email")
  public async forgotPassword(req: Request, res: Response) {
    try {
      const userRepo = dataSource.getRepository(User);
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }

      const user = await userRepo.findOne({ where: { email } });

      if (!user) {
        // Prevent email enumeration, silently succeed
        return res.status(200).json({ success: true, message: "If that email exists, we've sent a reset link." });
      }

      // Generate a unique reset token
      const resetToken = crypto.randomUUID();
      
      // Hash it before saving (optional for UUID, but good practice. We'll save directly for ease of lookup)
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await userRepo.save(user);

      const appUrl = process.env.APP_URL || "http://localhost:4200";
      const resetLink = `${appUrl}/authentication/reset-password/${resetToken}`;

      await EmailService.sendPasswordResetLink(
        user.email,
        resetLink
      );

      return res.status(200).json({
        success: true,
        message: "If that email exists, we've sent a reset link."
      });

    } catch (error: any) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Failed to process forgot password request"
      });
    }
  }

  @Post("/reset-password")
  @Swagger("Reset Password", "Reset password using token")
  public async resetPassword(req: Request, res: Response) {
    try {
      const userRepo = dataSource.getRepository(User);
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and new password are required" });
      }

      const user = await userRepo.findOne({ where: { resetPasswordToken: token } });

      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
        return res.status(400).json({ success: false, message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
      
      // Invalidate token
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.mustChangePassword = false;

      await userRepo.save(user);

      return res.status(200).json({
        success: true,
        message: "Password has been successfully reset"
      });

    } catch (error: any) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Failed to reset password"
      });
    }
  }


    @Post("/change-password")
    @Middleware([
        authenticateMiddleware,
        validate(ChangePasswordDto)
    ])
    @Swagger("Change Password", "Admin changing password of another user")
    public async changePassword(
        req:any,
        res:any
    ){
        try{
            const userRepo = dataSource.getRepository(User);
            const { user_id, password } = req.body;

            const targetUser = await userRepo.findOne({ where:{id:user_id} });
            if(!targetUser){
                return res.status(404).json({
                    success:false,
                    message:"User not found"
                });
            }

            const hashed = await bcrypt.hash(password, 12);
            targetUser.password = hashed;
            targetUser.mustChangePassword = false;

            await userRepo.save(targetUser);

            return res.status(200).json({
                success:true,
                message:"Password changed successfully"
            });
        }
        catch(error:any){
            return res.status(500).json({
                success:false,
                message:error.message
            });
        }
    }


    @Post("/change-my-password")
    @Middleware([
        authenticateMiddleware,
        validate(ChangeMyPasswordDto)
    ])
    @Swagger("Change My Password", "User changing their own password")
    public async changeMyPassword(
        req:any,
        res:any
    ){
        try{
            const userRepo = dataSource.getRepository(User);
            const { current_password, new_password } = req.body;
            const userId = req.user.userId;

            const user = await userRepo.findOne({ where:{id:userId} });
            if(!user){
                return res.status(404).json({
                    success:false,
                    message:"User not found"
                });
            }

            const matched = await bcrypt.compare(current_password, user.password);
            if(!matched){
                return res.status(400).json({
                    success:false,
                    message:"Incorrect current password"
                });
            }

            const hashed = await bcrypt.hash(new_password, 12);
            user.password = hashed;
            user.mustChangePassword = false;

            await userRepo.save(user);

            return res.status(200).json({
                success:true,
                message:"Password updated successfully"
            });
        }
        catch(error:any){
            return res.status(500).json({
                success:false,
                message:error.message
            });
        }
    }

}
