import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger,
  Put,
  Delete
} from "../decorators";

import { NextFunction } from "express";

import authenticateMiddleware from "../middleware/authenticate";

import { dataSource } from "../server";

import { Company } from "../entities/company";
import { User, UserRole } from "../entities/user";

import { EmailService } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";
import { Role } from "../entities/roles";
import { AuditLog } from "../entities/auditLogs";
import { Branch } from "../entities/branch";
import rateLimit from "express-rate-limit";

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many verification attempts"
});

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
req:any,
res:any,
next:NextFunction
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{

// =====================================
// ONLY SUPER ADMIN
// =====================================

if(!req.user.isSuperAdmin){

await queryRunner.rollbackTransaction();

return res.status(403).json({

success:false,
message:
"Only Super Admin can create companies"

});

}


// =====================================
// REQUEST BODY
// =====================================

const{

name,
email,
phone,
address,
gst_number,
role_id

}=req.body;


// =====================================
// REPOSITORIES
// =====================================

const companyRepo=
queryRunner.manager.getRepository(
Company
);

const userRepo=
queryRunner.manager.getRepository(
User
);

const roleRepo=
queryRunner.manager.getRepository(
UserRole
);

const roleMasterRepo=
queryRunner.manager.getRepository(
Role
);


// =====================================
// EMAIL EXIST CHECK
// =====================================

const existingUser=
await userRepo.findOne({

where:{
email
}

});

if(existingUser){

await queryRunner.rollbackTransaction();

return res.status(400).json({

success:false,
message:"Email already exists"

});

}


// =====================================
// ROLE VALIDATION
// =====================================

const role=
await roleMasterRepo.findOne({

where:{
id:role_id
}

});

if(!role){

await queryRunner.rollbackTransaction();

return res.status(404).json({

success:false,
message:"Role not found"

});

}


// =====================================
// OPTIONAL SECURITY
// Prevent assigning super admin
// =====================================

if(role.name==="SUPER_ADMIN"){

await queryRunner.rollbackTransaction();

return res.status(400).json({

success:false,
message:
"Super Admin role cannot be assigned"

});

}


// =====================================
// TEMP PASSWORD
// =====================================

const tempPassword=
crypto
.randomBytes(6)
.toString("hex");

const hashedPassword=
await bcrypt.hash(
tempPassword,
12
);

const verifyToken=
crypto.randomUUID();


// =====================================
// CREATE COMPANY ADMIN USER
// =====================================

const companyAdmin=
userRepo.create({

name:
`${name} Admin`,

email,

password:
hashedPassword,

mobilenumber:
phone,

emailVerified:
false,

verificationToken:
verifyToken,

mustChangePassword:
true,

isActive:true,

isSuperAdmin:false,

userType:
UserType.ADMIN

});

const savedUser=
await userRepo.save(
companyAdmin
);


// =====================================
// CREATE COMPANY
// =====================================

const company=
companyRepo.create({

name,
email,
phone,
address,
gst_number,

owner_id:
savedUser.id

});

const savedCompany=
await companyRepo.save(
company
);


// =====================================
// CREATE USER ROLE MAPPING
// =====================================

await roleRepo.save({

user:{
id:
savedUser.id
},

role:{
id:
role_id
},

company:{
id:
savedCompany.id
}

});


// =====================================
// COMMIT
// =====================================

await queryRunner.commitTransaction();


// =====================================
// EMAIL OUTSIDE TRANSACTION
// =====================================

EmailService
.sendCompanyAdminCredentials(

email,
tempPassword,
verifyToken

)
.catch((error)=>{

console.log(
"Mail Error:",
error
);

});


// =====================================
// RESPONSE
// =====================================

return res.status(201)
.json({

success:true,

message:
"Company created successfully",

companyId:
savedCompany.id,

adminUserId:
savedUser.id

});

}
catch(error:any){

await queryRunner.rollbackTransaction();

return res.status(500)
.json({

success:false,
message:error.message

});

}
finally{

await queryRunner.release();

}

}

  @Put("/:id")
@Middleware([authenticateMiddleware])
@Swagger("Update Company", "Super Admin Update Company")
public async update(
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
          "Only Super Admin can update companies"
      });

    }

    const companyId =
      Number(req.params.id);

    const {
      name,
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

    // ==========================
    // FIND COMPANY
    // ==========================

    const company =
      await companyRepo.findOne({
        where: {
          id: companyId
        }
      });

    if (!company) {

      await queryRunner.rollbackTransaction();

      return res.status(404).json({
        success: false,
        message:
          "Company not found"
      });

    }

    // ==========================
    // FIND COMPANY ADMIN
    // ==========================

    const companyAdmin =
      await userRepo.findOne({
        where: {
          id: company.owner_id
        }
      });

    // ==========================
    // EMAIL DUPLICATE CHECK
    // ==========================

    if (
      email &&
      email !== company.email
    ) {

      const existingUser =
        await userRepo.findOne({
          where: { email }
        });

      if (
        existingUser &&
        existingUser.id !==
        companyAdmin?.id
      ) {

        await queryRunner.rollbackTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Email already exists"
        });

      }

    }

    // ==========================
    // UPDATE COMPANY
    // ==========================

    company.name =
      name ??
      company.name;

    company.email =
      email ??
      company.email;

    company.phone =
      phone ??
      company.phone;

    company.address =
      address ??
      company.address;

    company.gst_number =
      gst_number ??
      company.gst_number;

    await companyRepo.save(
      company
    );

    // ==========================
    // UPDATE ADMIN USER
    // ==========================

    if (companyAdmin) {

      companyAdmin.name =
        `${name} Admin`;

      companyAdmin.email =
        email ??
        companyAdmin.email;

      companyAdmin.mobilenumber =
        phone ??
        companyAdmin.mobilenumber;

      await userRepo.save(
        companyAdmin
      );

    }

    await queryRunner.commitTransaction();

    return res.status(200).json({

      success: true,
      message:
        "Company updated successfully",

      company

    });

  } catch (error: any) {

    await queryRunner.rollbackTransaction();

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
@Middleware([
authenticateMiddleware
])
@Swagger(
"Get Companies",
"Get companies with branches and employees"
)
public async getAll(
req:any,
res:any
){

try{


// Security

if(
!req.user
){

return res.status(401)
.json({

success:false,
message:"Unauthorized"

});

}


const repo=
dataSource.getRepository(
Company
);


let companies=[];


// Super admin

if(
req.user.isSuperAdmin
){

companies=
await repo.find({

relations:{

branches:true,

userRoles:{

user:true,

role:true,

branch:true

}

},

select:{

id:true,
name:true,
email:true,
phone:true,
address:true,
gst_number:true,

branches:{

id:true,
name:true,
location:true,
email:true,
phone:true

},

userRoles:{

id:true,

user:{

id:true,
name:true,
email:true,
mobilenumber:true,
userType:true

},

role:{

id:true,
name:true

},

branch:{

id:true,
name:true

}

}

},

order:{
id:"DESC"
}

});

}


// Company user

else{

companies=
await repo.find({

where:{

id:
req.user.company_id

},

relations:{

branches:true,

userRoles:{

user:true,

role:true,

branch:true

}

},

select:{

id:true,
name:true,
email:true,
phone:true,
address:true,
gst_number:true,

branches:{

id:true,
name:true,
location:true

},

userRoles:{

id:true,

user:{

id:true,
name:true,
email:true

},

role:{

id:true,
name:true

},

branch:{

id:true,
name:true

}

}

}

});

}


return res.status(200)
.json({

success:true,

count:
companies.length,

data:
companies

});

}
catch(error:any){

console.log(
error
);

return res.status(500)
.json({

success:false,
message:error.message

});

}

}
  // ============================================
  // GET COMPANY BY ID
  // ============================================

  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Company","Get Company By Id")
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
@Swagger("Verify Email", "Verify user email securely")
public async verifyEmail(req: any, res: any) {
  const userRepo = dataSource.getRepository(User);

  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required"
      });
    }

    const user = await userRepo.findOne({
      where: {
        verificationToken: token
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already used token"
      });
    }

    // expiry validation
    if (
      user.verificationTokenExpires &&
      new Date() > user.verificationTokenExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification token expired"
      });
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await userRepo.save(user);

    return res.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

@Delete("/:id")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Delete Company",
"Delete company and related records (Super Admin only)"
)
public async delete(
req:any,
res:any
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{

if(
!req.user?.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:
"Only Super Admin can delete companies"

});

}

const companyId=
Number(
req.params.id
);

const companyRepo=
queryRunner.manager.getRepository(
Company
);

const company=
await companyRepo.findOne({

where:{
id:companyId
}

});

if(!company){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:
"Company not found"

});

}


await companyRepo.remove(
company
);

await queryRunner.commitTransaction();

return res.status(200)
.json({

success:true,
message:
"Company deleted successfully"

});

}
catch(error:any){

if(
queryRunner.isTransactionActive
){

await queryRunner.rollbackTransaction();

}

return res.status(500)
.json({

success:false,
message:
error.message

});

}
finally{

await queryRunner.release();

}

}
  
}