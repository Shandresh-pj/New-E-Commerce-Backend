import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger
} from "../decorators";

import { Request, Response, NextFunction } from "express";
import authenticateMiddleware from "../middleware/authenticate";
import validate from "../middleware/validate";
import { dataSource } from "../server";
import { Company } from "../entities/company";
import { CreateCompanyDto } from "../dto/company.dto";
import bcrypt from "bcryptjs";
import { User } from "../entities/user";

@Controller("/companies")
export class CompanyController {

  // =====================================================
  // CREATE COMPANY (SUPER ADMIN ONLY)
  // =====================================================
 @Post("/")
@Middleware([authenticateMiddleware])
@Swagger("Create Company")
public async create(req: any, res: any, next: NextFunction) {

  const queryRunner =
    dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {

    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin allowed"
      });
    }

    const {
      name,
      email,
      phone,
      address,
      gst_number
    } = req.body;

    const companyRepo =
      queryRunner.manager.getRepository(Company);

    const userRepo =
      queryRunner.manager.getRepository(User);

    const existing =
      await userRepo.findOne({
        where: { email }
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const tempPassword =
      Math.random()
        .toString(36)
        .slice(-8);

    const hashed =
      await bcrypt.hash(
        tempPassword,
        10
      );

    const token =
      crypto.randomUUID();

    const admin =
      userRepo.create({
        name,
        email,
        password: hashed,
        verificationToken: token,
        emailVerified: false,
        mustChangePassword: true
      });

    await userRepo.save(admin);

    const company =
      companyRepo.create({
        name,
        email,
        phone,
        address,
        gst_number,
        owner_id: admin.id
      });

    await companyRepo.save(company);

    await queryRunner.commitTransaction();

    return res.json({
      success: true,
      message:
        "Company created",
      loginEmail: email,
      temporaryPassword:
        tempPassword,
      verificationToken:
        token
    });

  } catch (err) {

    await queryRunner.rollbackTransaction();
    next(err);

  } finally {
    await queryRunner.release();
  }
}
  // =====================================================
  // GET ALL COMPANIES
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Companies", "List all companies")
  public async getAll(req: any, res: Response) {

    const repo = dataSource.getRepository(Company);

    const data = await repo.find({
      order: { id: "DESC" }
    });

    return res.json({
      success: true,
      data
    });
  }

  // =====================================================
  // GET COMPANY BY ID
  // =====================================================
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Company", "Get company by ID")
  public async getOne(req: any, res: Response) {

    const repo = dataSource.getRepository(Company);

    const data = await repo.findOne({
      where: { id: Number(req.params.id) }
    });

    return res.json({
      success: true,
      data
    });
  }


@Get("/verify/:token")
@Swagger("Verify Email")
public async verifyEmail(
  req: any,
  res: any
) {

  const repo =
    dataSource.getRepository(User);

  const user =
    await repo.findOne({
      where: {
        verificationToken:
          req.params.token
      }
    });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid token"
    });
  }

  user.emailVerified = true;
  user.verificationToken = null as any;

  await repo.save(user);

  return res.json({
    success: true,
    message:
      "Email verified successfully"
  });
}
}