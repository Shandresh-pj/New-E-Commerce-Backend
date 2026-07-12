
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

            const existingOtp =
            await otpRepo.findOne({

                where:{
                    user_id:user.id
                }

            });

            if(
                existingOtp &&
                existingOtp.expires_at >
                new Date()
            ){

                return res.status(429).json({

                    success:false,
                    message:
                    "Please wait before requesting another OTP"

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
                user_id:user.id
            });

            await otpRepo.save({

                user_id:user.id,
                otp:hashedOtp,
                verified:false,
                attempts:0,

                expires_at:new Date(
                    Date.now()+1*60*1000
                )

            });

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

            const record =
            await otpRepo.findOne({

                where:{
                    user_id:user.id
                }

            });

            if(!record){

                return res.status(400).json({

                    success:false,
                    message:"OTP not found"

                });

            }

            if(
                new Date() >
                record.expires_at
            ){

                await otpRepo.delete({
                    id:record.id
                });

                return res.status(400).json({

                    success:false,
                    message:"OTP expired"

                });

            }

            if(record.attempts>=5){

                return res.status(429).json({

                    success:false,
                    message:
                    "Maximum attempts exceeded"

                });

            }

            const valid =
            await bcrypt.compare(
                otp,
                record.otp
            );

            if(!valid){

                record.attempts++;

                await otpRepo.save(
                    record
                );

                return res.status(400).json({

                    success:false,
                    message:"Invalid OTP"

                });

            }

            record.verified=true;

            await otpRepo.save(
                record
            );

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

