import bcrypt from "bcrypt";

import {
  Controller,
  Post
} from "../decorators";

import dataSource from "../config/database";


import { OtpService } from "../services/otp.service";
import { EmailService } from "../utils/sendEmailOtp";
import { User } from "../entities/user";
import { OtpVerification } from "../entities/otp";
import { UserType } from "../utils/Role-Access";

@Controller("/customer")
export class CustomerController {

  @Post("/send-registration-otp")
  public async sendOtp(
    req: any,
    res: any
  ) {

    const { email } = req.body;

    const otpRepo =
      dataSource.getRepository(
        OtpVerification
      );

    const userRepo =
      dataSource.getRepository(User);

    const exists =
      await userRepo.findOne({
        where: { email }
      });

    if (exists) {
      return res.status(400).json({
        success: false,
        message:
          "Email already registered"
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
      email
    });

    await otpRepo.save({
      email,
      otp: hashedOtp,
      expires_at: new Date(
        Date.now() + 5 * 60 * 1000
      )
    });

    await EmailService.sendOtp(
      email,
      otp
    );

    return res.json({
      success: true,
      message: "OTP sent"
    });
  }

  @Post("/verify-registration-otp")
  public async verifyOtp(
    req: any,
    res: any
  ) {

    const {
      email,
      otp
    } = req.body;

    const repo =
      dataSource.getRepository(
        OtpVerification
      );

    const record =
      await repo.findOne({
        where: { email }
      });

    if (!record) {
      return res.status(400).json({
        message:
          "OTP not found"
      });
    }

    if (
      new Date() >
      record.expires_at
    ) {
      return res.status(400).json({
        message:
          "OTP expired"
      });
    }

    const valid =
      await bcrypt.compare(
        otp,
        record.otp
      );

    if (!valid) {
      return res.status(400).json({
        message:
          "Invalid OTP"
      });
    }

    record.verified = true;

    await repo.save(record);

    return res.json({
      success: true,
      message:
        "OTP verified"
    });
  }

  @Post("/register")
  public async register(
    req: any,
    res: any
  ) {

    const {
      name,
      email
    } = req.body;

    const otpRepo =
      dataSource.getRepository(
        OtpVerification
      );

    const userRepo =
      dataSource.getRepository(User);

    const otpRecord =
      await otpRepo.findOne({
        where: {
          email,
          verified: true
        }
      });

    if (!otpRecord) {
      return res.status(400).json({
        message:
          "Email verification required"
      });
    }

    const user =
      userRepo.create({
        name,
        email,
        userType:
          UserType.CUSTOMER,
        emailVerified: true,
        mustChangePassword: true
      });

    await userRepo.save(user);

    await otpRepo.delete({
      id: otpRecord.id
    });

    return res.json({
      success: true,
      message:
        "Registration successful"
    });
  }
}