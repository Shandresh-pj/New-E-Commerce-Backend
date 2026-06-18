import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger
} from "../decorators";

import { NextFunction } from "express";

import authenticateMiddleware from "../middleware/authenticate";

import { dataSource } from "../server";

import { Company } from "../entities/company";
import { User, UserRole } from "../entities/user";

import { EmailService } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";

@Controller("/companies")
export class CompanyController {

  // ============================================
  // CREATE COMPANY
  // ============================================

  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Create Company",
    "Super Admin Create Company"
  )
  public async create(
    req: any,
    res: any,
    next: NextFunction
  ) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if (!req.user.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message:
            "Only Super Admin can create companies"
        });
      }

      const {
        companyName,
        email,
        phone,
        address,
        gst_number
      } = req.body;

      const companyRepo =
        queryRunner.manager.getRepository(
          Company
        );

      const userRepo =
        queryRunner.manager.getRepository(
          User
        );

      const roleRepo =
        queryRunner.manager.getRepository(
          UserRole
        );

      const existing =
        await userRepo.findOne({
          where: { email }
        });

      if (existing) {

        await queryRunner.rollbackTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Email already exists"
        });
      }

      // =====================================
      // TEMP PASSWORD
      // =====================================

      const tempPassword =
        crypto
          .randomBytes(6)
          .toString("hex");

      const hashedPassword =
        await bcrypt.hash(
          tempPassword,
          12
        );

      const verifyToken =
        crypto.randomUUID();

      // =====================================
      // COMPANY ADMIN USER
      // =====================================

      const companyAdmin =
        userRepo.create({
          name: companyName + " Admin",
          email,
          password: hashedPassword,
          mobilenumber: phone,
          emailVerified: false,
          verificationToken:
            verifyToken,
          mustChangePassword: true,
          isActive: true,
          isSuperAdmin: false,
          userType:
            UserType.ADMIN
        });

      await userRepo.save(
        companyAdmin
      );

      // =====================================
      // COMPANY
      // =====================================

      const company =
        companyRepo.create({
          name: companyName,
          email,
          phone,
          address,
          gst_number,
          owner_id:
            companyAdmin.id
        });

      await companyRepo.save(
        company
      );

      // =====================================
      // USER ROLE
      // =====================================

      await roleRepo.save({
        user_id:
          companyAdmin.id,
        role_id: 2,
        company_id:
          company.id
      });

      // =====================================
      // SEND EMAIL
      // =====================================

      await EmailService
        .sendCompanyAdminCredentials(
          email,
          tempPassword,
          verifyToken
        );

      await queryRunner
        .commitTransaction();

      return res.status(201).json({
        success: true,
        message:
          "Company created successfully",
        companyId:
          company.id
      });

    } catch (error: any) {

      await queryRunner
        .rollbackTransaction();

      return res.status(500).json({
        success: false,
        message:
          error.message
      });

    } finally {

      await queryRunner.release();
    }
  }

  // ============================================
  // GET ALL COMPANIES
  // ============================================

  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Get Companies",
    "Get All Companies"
  )
  public async getAll(
    req: any,
    res: any
  ) {

    const repo =
      dataSource.getRepository(
        Company
      );

    const companies =
      await repo.find({
        order: {
          id: "DESC"
        }
      });

    return res.json({
      success: true,
      data: companies
    });
  }

  // ============================================
  // GET COMPANY BY ID
  // ============================================

  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Get Company",
    "Get Company By Id"
  )
  public async getOne(
    req: any,
    res: any
  ) {

    const repo =
      dataSource.getRepository(
        Company
      );

    const company =
      await repo.findOne({
        where: {
          id:
            Number(
              req.params.id
            )
        }
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found"
      });
    }

    return res.json({
      success: true,
      data: company
    });
  }

  // ============================================
  // VERIFY EMAIL
  // ============================================

  @Get("/verify/:token")
  @Swagger(
    "Verify Email",
    "Verify Company Admin Email"
  )
  public async verifyEmail(
    req: any,
    res: any
  ) {

    const userRepo =
      dataSource.getRepository(
        User
      );

    const user =
      await userRepo.findOne({
        where: {
          verificationToken:
            req.params.token
        }
      });

    if (!user) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid token"
      });
    }

    user.emailVerified =
      true;

    user.verificationToken =
      null as any;

    await userRepo.save(user);

    return res.json({
      success: true,
      message:
        "Email verified successfully"
    });
  }


  
}