import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  Controller,
  Post,
  Middleware,
  Swagger,
} from "../decorators";
import validate from "../middleware/validate";
import dataSource from "../config/database";
import { Register } from "../entities/register";
import { SendOtpDto, VerifyOtpDto } from "../dto/otp.dto";
import { OtpVerification } from "../entities/otp";
import { StatusType, UserType } from "../utils/Role-Access";
import { EmailService } from "../utils/sendEmailOtp";
import { generateRefreshToken, generateToken } from "../utils/jwt";
import bcrypt from "bcrypt";
import path from "path";

// @Controller("/otp")
// export class OtpController {

//   private generateOTP(): string {
//     return Math.floor(
//       100000 + Math.random() * 900000
//     ).toString();
//   }

//   @Post("/send")
//   @Middleware([
//     validate(SendOtpDto)
//   ])
//   @Swagger(
//     "Send OTP",
//     "Send OTP to Email"
//   )
//   public async sendOtp(
//     request: Request,
//     response: Response,
//     next: NextFunction
//   ) {

//     const queryRunner =
//       dataSource.createQueryRunner();

//     await queryRunner.connect();
//     await queryRunner.startTransaction();

//     try {

//       const { email } = request.body;

//       const registerRepository =
//         queryRunner.manager.getRepository(Register);

//       const otpRepository =
//         queryRunner.manager.getRepository(OtpVerification);

//       const existingUser =
//         await registerRepository.findOne({
//           where: { email },
//         });

//       let registrationId: number;

//       if (existingUser) {

//         registrationId = existingUser.id;

//       } else {

//         const user = registerRepository.create({
//           email,
//           status: StatusType.ACTIVE,
//         });

//         await registerRepository.save(user);

//         registrationId = user.id;
//       }

//       const otp = this.generateOTP();

//       const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//       await otpRepository.delete({ email });

//       const otpData = otpRepository.create({
//         registration: { id: registrationId },
//         email,
//         otp,
//         expires_at: expiresAt,
//         is_used: 0,
//       });

//       await otpRepository.save(otpData);

//       await EmailService.sendOtp(email, otp);

//       await queryRunner.commitTransaction();

//       return response.status(200).json({
//         success: true,
//         message: "OTP sent successfully",
//       });

//     } catch (error) {

//       await queryRunner.rollbackTransaction();

//       next(error);

//     } finally {

//       await queryRunner.release();

//     }
//   }

//   @Post("/verify")
//   @Middleware([
//     validate(VerifyOtpDto)
//   ])
//   @Swagger(
//     "Verify OTP",
//     "Verify Email OTP"
//   )
//   public async verifyOtp(
//     request: Request,
//     response: Response,
//     next: NextFunction
//   ) {

//     try {

//       const { email, otp } = request.body;

//       const otpRepository =
//         dataSource.getRepository(OtpVerification);

//       const otpRecord =
//         await otpRepository
//           .createQueryBuilder("otp")
//           .where("otp.email = :email", { email })
//           .andWhere("otp.otp = :otp", { otp })
//           .andWhere("otp.is_used = :used", { used: 0 })
//           .orderBy("otp.id", "DESC")
//           .getOne();

//       if (!otpRecord) {

//         return response.status(400).json({
//           success: false,
//           message: "Invalid OTP",
//         });
//       }

//       if (new Date(otpRecord.expires_at) < new Date()) {

//         return response.status(400).json({
//           success: false,
//           message: "OTP expired",
//         });
//       }

//       otpRecord.is_used = 1;

//       await otpRepository.save(otpRecord);

//       const registerRepository =
//         dataSource.getRepository(Register);

//       const user = await registerRepository.findOne({
//         where: { email: otpRecord.email },
//       });

//       const token = jwt.sign(
//         {
//           id: user?.id,
//           email: otpRecord.email,
//         },
//         process.env.JWT_SECRET as string,
//         { expiresIn: "24h" }
//       );

//       return response.status(200).json({
//         success: true,
//         message: "OTP verified successfully",
//         token,
//         user: user
//           ? {
//               id: user.id,
//               name: user.name,
//               email: user.email,
//               mobilenumber: user.mobilenumber,
//               image: user.image,
//             }
//           : null,
//       });

//     } catch (error) {

//       next(error);

//     }
//   }
// }

@Controller("/otp")
export class OtpController {
 
  private generateOTP(): string {
    return Math.floor(
      100000 + Math.random() * 900000
    ).toString();
  }
 
  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
 
  // ===================================================================
  // SEND OTP — email or mobile number
  // ===================================================================
  @Post("/send")
  @Middleware([
    validate(SendOtpDto)
  ])
  @Swagger(
    "Send OTP",
    "Send OTP to Email or Mobile Number"
  )
  public async sendOtp(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
 
    const queryRunner =
      dataSource.createQueryRunner();
 
    await queryRunner.connect();
    await queryRunner.startTransaction();
 
    try {
 
      const { identifier } = request.body;
 
      if (!identifier) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Email or mobile number is required",
        });
      }
 
      const usingEmail = this.isEmail(identifier);
 
      const registerRepository =
        queryRunner.manager.getRepository(Register);
 
      const otpRepository =
        queryRunner.manager.getRepository(OtpVerification);
 
      const existingUser =
        await registerRepository.findOne({
          where: usingEmail
            ? { email: identifier }
            : { mobilenumber: identifier },
        });
 
      let registrationId: number;
 
      if (existingUser) {
 
        registrationId = existingUser.id;
 
      } else {
 
        const user = registerRepository.create(
          usingEmail
            ? { email: identifier, status: StatusType.ACTIVE }
            : { mobilenumber: identifier, status: StatusType.ACTIVE }
        );
 
        await registerRepository.save(user);
 
        registrationId = user.id;
      }
 
      const otp = this.generateOTP();
 
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
 
      // NOTE: reusing the `email` column to store either identifier.
      await otpRepository.delete({ email: identifier });
 
      const otpData = otpRepository.create({
        registration: { id: registrationId },
        email: identifier,
        otp,
        expires_at: expiresAt,
        is_used: 0,
      });
 
      await otpRepository.save(otpData);
 
      if (usingEmail) {
        await EmailService.sendOtp(identifier, otp);
      } else {
        // await SmsService.sendOtp(identifier, otp);
      }
 
      await queryRunner.commitTransaction();
 
      return response.status(200).json({
        success: true,
        message: `OTP sent successfully to your ${usingEmail ? "email" : "mobile number"}`,
      });
 
    } catch (error) {
 
      await queryRunner.rollbackTransaction();
 
      next(error);
 
    } finally {
 
      await queryRunner.release();
 
    }
  }
 
  // ===================================================================
  // VERIFY OTP -> LOGIN
  // ===================================================================
  @Post("/verify")
  @Middleware([
    validate(VerifyOtpDto)
  ])
  @Swagger(
    "Verify OTP",
    "Verify OTP and Login"
  )
  public async verifyOtp(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
 
    try {
 
      const { identifier, otp } = request.body;
 
      const otpRepository =
        dataSource.getRepository(OtpVerification);
 
      const otpRecord =
        await otpRepository
          .createQueryBuilder("otp")
          .where("otp.email = :identifier", { identifier })
          .andWhere("otp.otp = :otp", { otp })
          .andWhere("otp.is_used = :used", { used: 0 })
          .orderBy("otp.id", "DESC")
          .getOne();
 
      if (!otpRecord) {
 
        return response.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }
 
      if (new Date(otpRecord.expires_at) < new Date()) {
 
        return response.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }
 
      otpRecord.is_used = 1;
 
      await otpRepository.save(otpRecord);
 
      const registerRepository =
        dataSource.getRepository(Register);
 
      const user = await registerRepository.findOne({
        where: { id: otpRecord.registration.id },
      });
 
      if (!user) {
 
        return response.status(404).json({
          success: false,
          message: "Account not found",
        });
      }
 
      if (user.status !== StatusType.ACTIVE) {
 
        return response.status(403).json({
          success: false,
          message: "Account disabled",
        });
      }
 
      // -----------------------------------------------------------------
      // ACCESS + REFRESH TOKEN — same lean-payload approach as
      // auth.controller.ts's /login
      // -----------------------------------------------------------------
      const payload = {
        userId: user.id,
        email: user.email,
        mobilenumber: user.mobilenumber,
        userType: UserType?.CUSTOMER, // or whatever user type you have
      };
 
      const token = generateToken(payload, "1d");
      const refreshToken = generateRefreshToken({ userId: user.id }, "7d");

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      (user as any).refreshToken = hashedRefreshToken;
      await registerRepository.save(user as any);

      // -----------------------------------------------------------------
      // BANNER TOKEN — short-lived, minimal claims, used only to fetch
      // dashboard promo/ad banners from a separate banner API
      // -----------------------------------------------------------------
      const bannerToken = jwt.sign(
        {
          userId: user.id,
          scope: "banner",
        },
        process.env.BANNER_TOKEN_SECRET as string,
        { expiresIn: "15m" }
      );
 
      const { password: _pw, refreshToken: _rt, ...safeUser } = user as any;
 
      return response.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token,
        refreshToken,
        bannerToken,
        user: safeUser,
        // redirect: "/dashboard",
      });
 
    } catch (error) {
 
      next(error);
 
    }
  }
}
 
