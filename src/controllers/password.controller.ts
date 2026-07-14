
import bcrypt from "bcrypt";

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
import { PasswordReset } from "../entities/password-reset.entity";

import {
    VerifyPasswordOtpDto,
    ResetPasswordDto,
    ChangePasswordDto,
    SendPasswordOtpDto,
    ChangeMyPasswordDto
} from "../dto";

import { OtpService } from "../services/otp.service";
import { EmailService } from "../utils/sendEmailOtp";
import { GlobalNotificationService } from "../services/global-notification.service";


@Controller("/password")
export class PasswordController {

    @Post("/send-otp")
    @Middleware([
        validate(SendPasswordOtpDto)
    ])
    @Swagger(
        "Send OTP",
        "Send OTP"
    )
    public async sendOtp(
        req:any,
        res:any
    ){

        try{

            const userRepo =
            dataSource.getRepository(User);

            const otpRepo =
            dataSource.getRepository(PasswordReset);

            const { email } = req.body;

            const user =
            await userRepo.findOne({
                where:{email}
            });

            if(!user){

                return res.status(404).json({

                    success:false,
                    message:"User not found"

                });

            }

            let existingOtp = await otpRepo.findOne({
                where: { user_id: user.id }
            });

            const now = new Date();

            if (existingOtp) {
                // 1. Check if account is locked due to too many failed verify attempts
                if (existingOtp.lock_until && existingOtp.lock_until > now) {
                    return res.status(429).json({
                        success: false,
                        message: "Account is temporarily locked due to too many failed attempts. Please try again later."
                    });
                }

                // 2. Check 24-hour resend limit (3 attempts max per 24 hours)
                if (existingOtp.resend_attempts >= 3) {
                    if (existingOtp.last_resend_at && (now.getTime() - existingOtp.last_resend_at.getTime()) < 24 * 60 * 60 * 1000) {
                        return res.status(429).json({
                            success: false,
                            message: "Maximum resend attempts reached. Please try again after 24 hours."
                        });
                    } else {
                        // Reset resend attempts after 24 hours
                        existingOtp.resend_attempts = 0;
                    }
                }

                // 3. Prevent rapid resend spam (1 minute cooldown)
                if (existingOtp.last_resend_at && (now.getTime() - existingOtp.last_resend_at.getTime()) < 60 * 1000) {
                    return res.status(429).json({
                        success: false,
                        message: "Please wait 1 minute before requesting another OTP."
                    });
                }
            }

            const otp = OtpService.generate();
            const hashedOtp = await bcrypt.hash(otp, 10);

            if (existingOtp) {
                existingOtp.otp = hashedOtp;
                existingOtp.expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 mins validity
                existingOtp.verified = false;
                existingOtp.attempts = 0; // Reset verify attempts on new send
                existingOtp.resend_attempts += 1;
                existingOtp.last_resend_at = now;
                await otpRepo.save(existingOtp);
            } else {
                await otpRepo.save({
                    user_id: user.id,
                    otp: hashedOtp,
                    verified: false,
                    attempts: 0,
                    resend_attempts: 1,
                    last_resend_at: now,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000)
                });
            }

            await EmailService.sendOtp(
                email,
                otp
            );

            return res.status(200).json({

                success:true,
                message:"OTP sent successfully"

            });

        }
        catch(error:any){

            console.log(error);

            return res.status(500).json({

                success:false,
                message:error.message

            });

        }

    }



    @Post("/verify-otp")
    @Middleware([
        validate(
            VerifyPasswordOtpDto
        )
    ])
    public async verifyOtp(
        req:any,
        res:any
    ){

        try{

            const userRepo =
            dataSource.getRepository(User);

            const otpRepo =
            dataSource.getRepository(PasswordReset);

            const {
                email,
                otp
            }=req.body;

            const user =
            await userRepo.findOne({

                where:{email}

            });

            if(!user){

                return res.status(404).json({

                    success:false,
                    message:"User not found"

                });

            }

            const record = await otpRepo.findOne({
                where: { user_id: user.id }
            });

            if (!record) {
                return res.status(400).json({
                    success: false,
                    message: "OTP not found"
                });
            }

            const now = new Date();

            // 1. Check if account is locked
            if (record.lock_until && record.lock_until > now) {
                return res.status(429).json({
                    success: false,
                    message: "Account is temporarily locked. Please try again later."
                });
            }

            // 2. Check if OTP expired
            if (now > record.expires_at) {
                return res.status(400).json({
                    success: false,
                    message: "OTP expired"
                });
            }

            const valid = await bcrypt.compare(otp, record.otp);

            if (!valid) {
                record.attempts += 1;
                
                // 3. Check if failed limit reached (3 attempts)
                if (record.attempts >= 3) {
                    record.lock_until = new Date(now.getTime() + 30 * 60 * 1000); // Lock for 30 minutes
                    await otpRepo.save(record);
                    return res.status(429).json({
                        success: false,
                        message: "Too many failed attempts. Account locked for 30 minutes."
                    });
                }

                await otpRepo.save(record);
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            }

            record.verified = true;
            record.attempts = 0; // Reset attempts on success
            await otpRepo.save(record);

            return res.status(200).json({

                success:true,
                message:"OTP verified"

            });

        }
        catch(error:any){

            return res.status(500).json({

                success:false,
                message:error.message

            });

        }

    }



    @Post("/reset-password")
    @Middleware([
        validate(
            ResetPasswordDto
        )
    ])
    public async resetPassword(
        req:any,
        res:any
    ){

        try{

            const userRepo =
            dataSource.getRepository(User);

            const otpRepo =
            dataSource.getRepository(PasswordReset);

            const {

                email,
                newPassword,
                confirmPassword

            }=req.body;

            if(
                newPassword !==
                confirmPassword
            ){

                return res.status(400).json({

                    success:false,
                    message:
                    "Passwords do not match"

                });

            }

            const user =
            await userRepo.findOne({

                where:{email}

            });

            if(!user){

                return res.status(404).json({

                    success:false,
                    message:"User not found"

                });

            }

            const otpRecord =
            await otpRepo.findOne({

                where:{
                    user_id:user.id,
                    verified:true
                }

            });

            if(!otpRecord){

                return res.status(400).json({

                    success:false,
                    message:
                    "OTP verification required"

                });

            }

            user.password =
            await bcrypt.hash(
                newPassword,
                12
            );

            user.mustChangePassword=false;

            await userRepo.save(
                user
            );

            await otpRepo.delete({

                id:otpRecord.id

            });

            await GlobalNotificationService.sendNotification(
                `Password reset successfully for ${user.email}`,
                "PASSWORD_CHANGE"
            );

            return res.status(200).json({

                success:true,
                message:
                "Password reset successful"

            });

        }
        catch(error:any){

            return res.status(500).json({

                success:false,
                message:error.message

            });

        }

    }



    @Post(
        "/change-password"
    )
    @Middleware([
        authenticateMiddleware,
        validate(
            ChangePasswordDto
        )
    ])
    public async changePassword(
        req:any,
        res:any
    ){

        try{

            const userRepo =
            dataSource.getRepository(User);

            const user =
            await userRepo.findOne({

                where:{
                    id:req.user?.user_id
                }

            });

            if(!user){

                return res.status(404).json({

                    success:false,
                    message:"User not found"

                });

            }

            await GlobalNotificationService.sendNotification(
                `Password changed successfully for ${user.email}`,
                "PASSWORD_CHANGE"
            );

            return res.status(200).json({

                success:true

            });

        }
        catch(error:any){

            return res.status(500).json({

                success:false,
                message:error.message

            });

        }

    }



    @Post(
        "/change-temporary-password"
    )
    @Middleware([
        validate(
            ChangeMyPasswordDto
        )
    ])
    public async changeTemporaryPassword(
        req:any,
        res:any
    ){

        try{

            const userRepo =
            dataSource.getRepository(User);

            const {
                email,
                password
            }=req.body;

            const user =
            await userRepo.findOne({

                where:{email}

            });

            if(!user){

                return res.status(404).json({

                    success:false,
                    message:"User not found"

                });

            }

            user.password =
            await bcrypt.hash(
                password,
                12
            );

            user.mustChangePassword=false;

            await userRepo.save(
                user
            );

            await GlobalNotificationService.sendNotification(
                `Temporary password changed successfully for ${user.email}`,
                "PASSWORD_CHANGE"
            );

            return res.status(200).json({

                success:true,
                message:
                "Password changed"

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

