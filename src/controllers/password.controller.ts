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
        authenticateMiddleware
    ])
    @Swagger("Change Password", "Change password for user or self")
    public async changePassword(
        req:any,
        res:any
    ){
        try{
            const userRepo = dataSource.getRepository(User);
            const body = req.body || {};
            const targetUserId = body.user_id || body.userId || req.user?.id || req.user?.userId || req.user?.user_id;

            if(!targetUserId){
                return res.status(400).json({
                    success:false,
                    message:"User ID is required"
                });
            }

            const targetUser = await userRepo.findOne({ where:{ id: Number(targetUserId) } });
            if(!targetUser){
                return res.status(404).json({
                    success:false,
                    message:"User not found"
                });
            }

            const newPass = body.new_password || body.newPassword || body.password;
            const currentPass = body.current_password || body.currentPassword || body.oldPassword;

            if(!newPass){
                return res.status(400).json({
                    success:false,
                    message:"New password is required"
                });
            }

            // If user is changing their own password, verify current password
            const isSelf = targetUser.id === (req.user?.id || req.user?.userId || req.user?.user_id);
            if(isSelf && currentPass){
                const matched = await bcrypt.compare(currentPass, targetUser.password);
                if(!matched){
                    return res.status(400).json({
                        success:false,
                        message:"Incorrect current password"
                    });
                }
            }

            const hashed = await bcrypt.hash(newPass, 12);
            targetUser.password = hashed;
            targetUser.mustChangePassword = false;

            await userRepo.save(targetUser);

            return res.status(200).json({
                success:true,
                message:"Password updated successfully"
            });
        }
        catch(error:any){
            console.error("Error in changePassword:", error);
            return res.status(500).json({
                success:false,
                message:error.message || "Failed to change password"
            });
        }
    }


    @Post("/change-my-password")
    @Middleware([
        authenticateMiddleware
    ])
    @Swagger("Change My Password", "User changing their own password")
    public async changeMyPassword(
        req:any,
        res:any
    ){
        try{
            const userRepo = dataSource.getRepository(User);
            const body = req.body || {};
            const current_password = body.current_password || body.currentPassword || body.oldPassword;
            const new_password = body.new_password || body.newPassword;
            const userId = req.user?.id || req.user?.userId || req.user?.user_id;

            if(!userId){
                return res.status(401).json({
                    success:false,
                    message:"Unauthorized: User ID not found in session"
                });
            }

            const user = await userRepo.findOne({ where:{ id: Number(userId) } });
            if(!user){
                return res.status(404).json({
                    success:false,
                    message:"User not found"
                });
            }

            if(current_password){
                const matched = await bcrypt.compare(current_password, user.password);
                if(!matched){
                    return res.status(400).json({
                        success:false,
                        message:"Incorrect current password"
                    });
                }
            }

            if(!new_password){
                return res.status(400).json({
                    success:false,
                    message:"New password is required"
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
            console.error("Error in changeMyPassword:", error);
            return res.status(500).json({
                success:false,
                message:error.message || "Failed to update password"
            });
        }
    }

}
