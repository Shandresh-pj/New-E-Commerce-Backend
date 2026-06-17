import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger
} from "../decorators";

import { Request, Response, NextFunction } from "express";
import { dataSource } from "../server";

import authenticateMiddleware from "../middleware/authenticate";
import validate from "../middleware/validate";

import { Branch } from "../entities/branch";
import { Company } from "../entities/company";
import { CreateBranchDto } from "../dto/branch.dto";

@Controller("/branches")
export class BranchController {

  // =====================================================
  // CREATE BRANCH
  // =====================================================
 @Post("/")
@Middleware([authenticateMiddleware, validate(CreateBranchDto)])
@Swagger("Create Branch", "Admin/SuperAdmin creates branch")
public async create(req: any, res: any, next: NextFunction) {
  try {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const isAdmin =
      req.user.isSuperAdmin || req.user.roleId === 2;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can create branch"
      });
    }

    const companyRepo = dataSource.getRepository(Company);
    const branchRepo = dataSource.getRepository(Branch);

    const companyId =
      req.user.isSuperAdmin
        ? req.body.company_id
        : req.user.company_id;

    const company = await companyRepo.findOne({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const branch = branchRepo.create({
      company_id: company.id,
      name: req.body.name,
      location: req.body.location
    });

    await branchRepo.save(branch);

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch
    });

  } catch (err) {
    next(err);
  }
}

  // =====================================================
  // GET ALL BRANCHES
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Branches", "List company branches")
  public async getAll(req: any, res: any, next: NextFunction) {

    try {

      const repo = dataSource.getRepository(Branch);

      const branches = await repo.find({
        where: {
          company_id: req.user.company_id
        }
      });

      return res.json({
        success: true,
        data: branches
      });

    } catch (err) {
      next(err);
    }
  }
}