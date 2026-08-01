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
  validate(SendOtpDto),
])
@Swagger(
  "Send OTP",
  "Send OTP using Email or Mobile Number"
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

    const {
      email,
      mobilenumber,
    } = request.body;

    // ============================================================
    // VALIDATION
    // ============================================================

    if (!email && !mobilenumber) {

      await queryRunner.rollbackTransaction();

      return response.status(400).json({
        success: false,
        message: "Email or Mobile Number is required.",
      });

    }

    if (email && mobilenumber) {

      await queryRunner.rollbackTransaction();

      return response.status(400).json({
        success: false,
        message: "Provide either Email or Mobile Number, not both.",
      });

    }

    const usingEmail = !!email;

    const value = usingEmail
      ? email
      : mobilenumber;

    // ============================================================
    // REPOSITORIES
    // ============================================================

    const registerRepository =
      queryRunner.manager.getRepository(Register);

    const otpRepository =
      queryRunner.manager.getRepository(OtpVerification);

    // ============================================================
    // CHECK USER
    // ============================================================

    let user =
      await registerRepository.findOne({

        where: usingEmail
          ? { email }
          : { mobilenumber },

      });

    // ============================================================
    // CREATE USER IF NOT EXISTS
    // ============================================================

    if (!user) {

      user = registerRepository.create({

        email: usingEmail
          ? email
          : null,

        mobilenumber: usingEmail
          ? null
          : mobilenumber,

        status: StatusType.ACTIVE,

      });

      await registerRepository.save(user);

    }

    // ============================================================
    // GENERATE OTP
    // ============================================================

    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    const expiresAt =
      new Date(
        Date.now() + (5 * 60 * 1000)
      );

    // ============================================================
    // DELETE OLD OTP
    // ============================================================

    await otpRepository.delete({
      email: value,
    });

    // ============================================================
    // SAVE OTP
    // ============================================================

    const otpData =
      otpRepository.create({

        registration: {
          id: user.id,
        },

        email: value,

        otp,

        expires_at: expiresAt,

        is_used: 0,

      });

    await otpRepository.save(otpData);

    // ============================================================
    // SEND OTP
    // ============================================================

    if (usingEmail) {

      await EmailService.sendOtp(
        email,
        otp
      );

    } else {

      // SMS Integration

      // await SmsService.sendOtp(
      //   mobilenumber,
      //   otp
      // );

      console.log(
        `OTP ${otp} sent to ${mobilenumber}`
      );

    }

    // ============================================================
    // COMMIT
    // ============================================================

    await queryRunner.commitTransaction();

    return response.status(200).json({

      success: true,

      message: usingEmail
        ? "OTP sent successfully to your email."
        : "OTP sent successfully to your mobile number.",

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
  // ===================================================================
// VERIFY OTP
// ===================================================================
@Post("/verify")
@Middleware([
  validate(VerifyOtpDto),
])
@Swagger(
  "Verify OTP",
  "Verify Email/Mobile OTP and Login"
)
public async verifyOtp(
  request: Request,
  response: Response,
  next: NextFunction
) {

  try {

    const {
      email,
      mobilenumber,
      otp,
    } = request.body;

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!email && !mobilenumber) {

      return response.status(400).json({
        success: false,
        message: "Email or Mobile Number is required.",
      });

    }

    if (email && mobilenumber) {

      return response.status(400).json({
        success: false,
        message: "Provide either Email or Mobile Number, not both.",
      });

    }

    const usingEmail = !!email;

    const value = usingEmail
      ? email
      : mobilenumber;

    // ==========================================================
    // REPOSITORIES
    // ==========================================================

    const otpRepository =
      dataSource.getRepository(OtpVerification);

    const registerRepository =
      dataSource.getRepository(Register);

    // ==========================================================
    // FIND OTP
    // ==========================================================

    const otpRecord =
      await otpRepository
        .createQueryBuilder("otp")
        .leftJoinAndSelect(
          "otp.registration",
          "registration"
        )
        .where(
          "otp.email = :value",
          { value }
        )
        .andWhere(
          "otp.otp = :otp",
          { otp }
        )
        .andWhere(
          "otp.is_used = :used",
          { used: 0 }
        )
        .orderBy(
          "otp.id",
          "DESC"
        )
        .getOne();

    if (!otpRecord) {

      return response.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });

    }

    // ==========================================================
    // OTP EXPIRY
    // ==========================================================

    if (
      new Date(otpRecord.expires_at) <
      new Date()
    ) {

      return response.status(400).json({
        success: false,
        message: "OTP has expired.",
      });

    }

    // ==========================================================
    // MARK OTP USED
    // ==========================================================

    otpRecord.is_used = 1;

    await otpRepository.save(
      otpRecord
    );

    // ==========================================================
    // FIND USER
    // ==========================================================

    const targetUserId = otpRecord.registration?.id;
    const user = (await registerRepository.findOne({
      where: targetUserId
        ? { id: targetUserId }
        : usingEmail
        ? { email: value }
        : { mobilenumber: value },
    })) as (Register & {
      refreshToken?: string;
    });

    if (!user) {
      return response.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ==========================================================
    // ACCOUNT STATUS
    // ==========================================================

    if (
      user.status !==
      StatusType.ACTIVE
    ) {

      return response.status(403).json({

        success: false,
        message: "Your account is disabled.",

      });

    }

    // ==========================================================
    // JWT PAYLOAD
    // ==========================================================

    const payload = {

      userId: user.id,

      email: user.email,

      mobilenumber:
        user.mobilenumber,

      userType:
        UserType.CUSTOMER,

    };

    // ==========================================================
    // TOKENS
    // ==========================================================

    const token =
      generateToken(
        payload,
        "1d"
      );

    const refreshToken =
      generateRefreshToken(
        {
          userId: user.id,
        },
        "7d"
      );

    const hashedRefreshToken =
      await bcrypt.hash(
        refreshToken,
        10
      );

    user.refreshToken =
      hashedRefreshToken;

    await registerRepository.save(
      user
    );

    // ==========================================================
    // BANNER TOKEN
    // ==========================================================

    const bannerSecret =
      process.env.BANNER_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      "super-secret-banner-key-svk-dth";

    const bannerToken =
      jwt.sign(

        {
          userId: user.id,
          scope: "banner",
        },

        bannerSecret,

        {
          expiresIn: "15m",
        }

      );

    // ==========================================================
    // REMOVE SENSITIVE DATA
    // ==========================================================

    const {

      password,

      refreshToken: storedRefreshToken,

      ...safeUser

    } = user as any;

    // ==========================================================
    // SUCCESS RESPONSE
    // ==========================================================

    return response.status(200).json({

      success: true,

      message:
        "OTP verified successfully.",

      token,

      refreshToken,

      bannerToken,

      user: safeUser,

    });

  } catch (error) {

    next(error);

  }

}
}
 
