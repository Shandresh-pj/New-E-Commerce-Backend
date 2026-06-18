import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  Controller,
  Post,
  Middleware,
  Swagger,
} from "../decorators";
import validate from "../middleware/validate";
import { dataSource } from "../server";
import { Register } from "../entities/register";
import { SendOtpDto, VerifyOtpDto } from "../dto/otp.dto";
import { OtpVerification } from "../entities/otp";
import { StatusType } from "../utils/Role-Access";
import sendSmsOtp from "../utils/sendSmsOtp";

@Controller("/otp")
export class OtpController {

 private generateOTP(): string {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
}

  @Post("/send")
  @Middleware([
    validate(SendOtpDto)
  ])
  @Swagger(
    "Send OTP",
    "Send OTP to Email or Mobile"
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
        mobile
      } = request.body;

      let registrationId: number | null =
        null;

      const registerRepository =
        queryRunner.manager.getRepository(
          Register
        );

      const otpRepository =
        queryRunner.manager.getRepository(
          OtpVerification
        );

      if (!email && !mobile) {

        await queryRunner.rollbackTransaction();

        return response.status(400).json({
          success: false,
          message:
            "Email or Mobile is required",
        });
      }

      if (email) {

        const existingUser =
          await registerRepository.findOne({
            where: { email },
          });

        if (existingUser) {

          registrationId =
            existingUser.id;

        } else {

          const user =
            registerRepository.create({
              email,
              status: StatusType.ACTIVE,
            });

          await registerRepository.save(
            user
          );

          registrationId = user.id;
        }
      }

      const otp =
        this.generateOTP();

      const expiresAt =
        new Date(
          Date.now() + 60 * 1000
        );

      await otpRepository.delete({
        email,
      });

      const otpData =
        otpRepository.create({
          registration: { id: registrationId!, },
          email,
          mobile,
          otp,
          expires_at:
            expiresAt,
          is_used: 0,
        });

      await otpRepository.save(
        otpData
      );

      if (email) {
        await sendSmsOtp(
          email,
          otp
        );
      }

      if (mobile) {
        await sendSmsOtp(
          mobile,
          otp
        );
      }

      await queryRunner.commitTransaction();

      return response.status(200).json({
        success: true,
        message:
          "OTP sent successfully",
      });

    } catch (error) {

      await queryRunner.rollbackTransaction();

      next(error);

    } finally {

      await queryRunner.release();

    }
  }

  @Post("/verify")
  @Middleware([
    validate(VerifyOtpDto)
  ])
  @Swagger(
    "Verify OTP",
    "Verify Email/Mobile OTP"
  )
  public async verifyOtp(
    request: Request,
    response: Response,
    next: NextFunction
  ) {

    try {

      const {
        email,
        mobile,
        otp,
      } = request.body;

      const otpRepository =
        dataSource.getRepository(
          OtpVerification
        );

      const otpRecord =
        await otpRepository
          .createQueryBuilder("otp")
          .where(
            "(otp.email = :email OR otp.mobile = :mobile)",
            {
              email,
              mobile,
            }
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
          message:
            "Invalid OTP",
        });
      }

      if (
        new Date(
          otpRecord.expires_at
        ) < new Date()
      ) {

        return response.status(400).json({
          success: false,
          message:
            "OTP expired",
        });
      }

      otpRecord.is_used = 1;

      await otpRepository.save(
        otpRecord
      );

      const registerRepository =
        dataSource.getRepository(Register);

      const user = await registerRepository.findOne({
        where: otpRecord.email
          ? { email: otpRecord.email }
          : { mobilenumber: otpRecord.mobile },
      });

      const token =
        jwt.sign(
          {
            id: user?.id,
            email: otpRecord.email, 
            mobile: otpRecord.mobile,
            mobilenumber: user?.mobilenumber,
            // usertype: user?.usertype,
          },
          process.env
            .JWT_SECRET as string,
          {
            expiresIn: "24h",
          }
        );

      return response.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              mobilenumber: user.mobilenumber,
              image: user.image,
              // usertype: user.usertype,
            }
          : null,
      });

    } catch (error) {

      next(error);

    }
  }
}