import {
Controller,
Post,
Get,
Put,
Delete,
Middleware,
Swagger
} from "../decorators";

import { NextFunction } from "express";

import authenticateMiddleware
from "../middleware/authenticate.middleware";

import validate
from "../middleware/validate";

import { dataSource }
from "../server";

import { Branch }
from "../entities/branch";

import { Company }
from "../entities/company";

import { CreateBranchDto }
from "../dto/branch.dto";
import { EmailService } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";
import { User, UserRole } from "../entities/user";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role } from "../entities/roles";
import { auditMiddleware } from "../middleware/audit.Middleware";

@Controller("/branches")
export class BranchController{


// =====================================
// CREATE BRANCH
// =====================================
@Post("/")
@Middleware([authenticateMiddleware,auditMiddleware("BRANCH"), validate(CreateBranchDto)])
public async create(req: any, res: any) {
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const branchRepo = queryRunner.manager.getRepository(Branch);
    const userRepo = queryRunner.manager.getRepository(User);
    const roleRepo = queryRunner.manager.getRepository(UserRole);
    const companyRepo = queryRunner.manager.getRepository(Company);
    const roleMasterRepo = queryRunner.manager.getRepository(Role);

    const {
      company_id,
      name,
      location,
      email,
      phone,
      role_id
    } = req.body;

    // Company check
    const company = await companyRepo.findOne({
      where: { id: company_id }
    });

    if (!company) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Role check
    const role = await roleMasterRepo.findOne({
      where: { id: role_id }
    });

    if (!role) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // Create Branch
    const branch = branchRepo.create({
      company: { id: company_id },
      name,
      location,
      email,
      phone
    });

    const savedBranch = await branchRepo.save(branch);

    // Generate password
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user (branch manager)
    const branchAdmin = userRepo.create({
      name: `${name} BRANCH`,
      email,
      mobilenumber: phone,
      password: hashedPassword,
      userType: UserType.BRANCH,
      mustChangePassword: true,
      isActive: true,
      isSuperAdmin: false
    });

    const savedUser = await userRepo.save(branchAdmin);

    // Role mapping
    await roleRepo.save({
      user: { id: savedUser.id },
      company: { id: company_id },
      branch: { id: savedBranch.id },
      role: { id: role_id }
    });

    await queryRunner.commitTransaction();

    // Email outside transaction (safe)
    EmailService.sendTemporaryPassword(
      email,
      tempPassword,
      `${name} BRANCH MANAGER`
    ).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Branch created successfully"
    });

  } catch (error: any) {
    await queryRunner.rollbackTransaction();

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    await queryRunner.release();
  }
}


// =====================================
// GET ALL BRANCHES
// =====================================

@Get("/")
@Middleware([authenticateMiddleware])
public async getAll(req: any, res: any) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const repo = dataSource.getRepository(Branch);

    const relations = {
      company: true,
      userRoles: {
        user: true,
        role: true
      }
    };

    let branches;

    if (req.user.isSuperAdmin) {
      branches = await repo.find({
        relations,
        order: { id: "DESC" }
      });
    } else {
      branches = await repo.find({
        where: {
          company: { id: req.user.company_id }
        },
        relations,
        order: { id: "DESC" }
      });
    }

    return res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}



// =====================================
// GET BRANCH BY ID
// =====================================

@Get("/:id")
@Middleware([authenticateMiddleware])
public async getById(req: any, res: any) {
  try {
    const repo = dataSource.getRepository(Branch);

    const branch = await repo.findOne({
      where: {
        id: Number(req.params.id)
      },
      relations: {
        company: true,
        userRoles: {
          user: true,
          role: true
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    // Security check (important)
    if (!req.user.isSuperAdmin && branch.company.id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    return res.status(200).json({
      success: true,
      data: branch
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}



// =====================================
// UPDATE BRANCH
// =====================================

@Put("/:id")
@Middleware([authenticateMiddleware])
public async update(req: any, res: any) {
  try {
    const repo = dataSource.getRepository(Branch);

    const branch = await repo.findOne({
      where: { id: Number(req.params.id) },
      relations: { company: true }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    // security check
    if (!req.user.isSuperAdmin && branch.company.id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    repo.merge(branch, {
      name: req.body.name,
      location: req.body.location,
      email: req.body.email,
      phone: req.body.phone
    });

    const updated = await repo.save(branch);

    return res.status(200).json({
      success: true,
      message: "Branch updated",
      data: updated
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}



// =====================================
// DELETE BRANCH
// =====================================

@Delete("/:id")
@Middleware([
authenticateMiddleware
])

public async delete(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
Branch
);

const branch=
await repo.findOne({
where:{id:Number(req.params.id)}
});

if(!branch){
return res.status(404).json({
success:false,
message:"Branch not found"
});
}
await repo.delete(branch.id);
return res.status(200).json({
success:true,
message:
"Branch deleted"});

} catch(error:any){return res.status(500).json({
success:false,
message:error.message
});
}

}

}