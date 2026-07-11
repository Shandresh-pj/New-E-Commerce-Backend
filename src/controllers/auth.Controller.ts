import {
  Request,
  Response,
  NextFunction,
} from "express";

import bcrypt from "bcrypt";
import path from "path";

import {
  Controller,
  Post,
  Middleware,
  Swagger,
  Get,
  Delete,
} from "../decorators";

import validate from "../middleware/validate";

import dataSource from "../config/database";
import jwt from "jsonwebtoken";

import { Register } from "../entities/register";
import { CreateProfileDto, LoginDto, RegisterDto, UpdateProfileDto } from "../dto/register.dto";
import { Put } from "../decorators/put";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { generateToken } from "../utils/jwt";
// import { permissionGuard } from "../middleware/permissionGuard.middleware";
import { User, UserRole } from "../entities/user";
import { RolePermission } from "../entities/role-access";
import { EmailService, generateTempPassword } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";
import { Menu, Permission } from "../entities/menu";
import { Role } from "../entities/roles";
import { Company } from "../entities/company";
import { Branch } from "../entities/branch";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { PermissionService } from "../services/permission.service";

const buildUploadedFileUrl = (
  file?: Express.Multer.File
): string | undefined => {
  if (!file) return undefined;
  const relativePath = path
    .relative(process.cwd(), file.path)
    .split(path.sep)
    .join("/");
  return `/${relativePath}`;
};

@Controller("/auth")
export class AuthController {

  // @Post("/register")
  // @Middleware([validate(RegisterDto)])
  // @Swagger("Register User", "Create normal user with default role")
  // public async register(req: any, res: any, next: NextFunction) {
  //   const queryRunner = dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {

  //     const { name, email, password, mobilenumber } = req.body;

  //     const userRepo = queryRunner.manager.getRepository(User);
  //     const roleRepo = queryRunner.manager.getRepository(UserRole);

  //     const exists = await userRepo.findOne({ where: { email } });

  //     if (exists) {
  //       await queryRunner.rollbackTransaction();
  //       return res.status(400).json({
  //         message: "Email already exists"
  //       });
  //     }

  //     const hashed = await bcrypt.hash(password, 10);

  //     const user = userRepo.create({
  //       name,
  //       email,
  //       password: hashed,
  //       mobilenumber,
  //       isSuperAdmin: false
  //     });

  //     await userRepo.save(user);

  //     await roleRepo.save({
  //       user_id: user.id,
  //       role_id: 7, // CUSTOMER
  //       company_id: 1
  //     });

  //     await queryRunner.commitTransaction();

  //     return res.json({
  //       success: true,
  //       message: "User registered successfully",
  //       data: user
  //     });

  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     next(err);
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

    // =====================================================
  // REGISTER (PUBLIC - CUSTOMER ONLY)
  // =====================================================

 @Post("/register")
@Middleware([validate(RegisterDto)])
@Swagger(
"Register User",
"Customer registration"
)
public async register(
req:any,
res:any,
next:NextFunction
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{

const{

name,
email,
password,
mobilenumber,
role_id,
company_id

}=req.body;


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


// Email exists check

const exists=
await userRepo.findOne({

where:{
email
}

});

if(exists){

await queryRunner.rollbackTransaction();

return res.status(400)
.json({

success:false,
message:"Email already exists"

});

}


// Role validation

const role=
await roleMasterRepo.findOne({

where:{
id:role_id
}

});

if(!role){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:"Role not found"

});

}


// Optional security
// Prevent Super Admin registration

if(
role.name==="Super_Admin"
){

await queryRunner.rollbackTransaction();

return res.status(403)
.json({

success:false,
message:
"Cannot assign Super Admin role"

});

}


// Password hash

const hashed=
await bcrypt.hash(
password,
12
);


// Create user

const user=
userRepo.create({

name,
email,
password:hashed,
mobilenumber,

userType:
UserType.CUSTOMER,

isSuperAdmin:false,

mustChangePassword:false,

isActive:true

});


const savedUser=
await userRepo.save(
user
);


// Save role mapping

// Save role mapping

await roleRepo.save({

user_id: savedUser.id,

role_id: role_id,

company_id:
company_id
?company_id
:undefined

});


await queryRunner
.commitTransaction();


// remove password from response

const{
password:removed,
...userResponse
}=savedUser;


return res.status(201)
.json({

success:true,

message:
"User registered successfully",

data:
userResponse

});

}
catch(error:any){

await queryRunner
.rollbackTransaction();

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


  /**
   * LOGIN USER
   */
@Post("/login")
@Middleware([
validate(LoginDto)
])
public async login(
req:Request,
res:Response
){

try{

const{
email,
password
}=req.body;

const userRepo=
dataSource.getRepository(
User
);

const userRoleRepo=
dataSource.getRepository(
UserRole
);


// =====================================
// FIND USER
// =====================================

const user=
await userRepo.findOne({

where:{
email
}

});

if(!user){

return res.status(401)
.json({

success:false,
message:
"Invalid email or password"

});

}


// =====================================
// USER ACTIVE CHECK
// =====================================

if(!user.isActive){

return res.status(403)
.json({

success:false,
message:
"Account disabled"

});

}


// =====================================
// PASSWORD CHECK
// =====================================

const matched=
await bcrypt.compare(

password,
user.password

);

if(!matched){

return res.status(401)
.json({

success:false,
message:
"Invalid email or password"

});

}


// =====================================
// GET USER ROLES
// =====================================

const userRoles=
await userRoleRepo.find({

where:{

user:{
id:user.id
}

},

relations:{

role:true,
company:true,
branch:true

}

});


if(
!userRoles.length &&
!user.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:
"No role assigned"

});

}


// =====================================
// LOAD PERMISSIONS (SCOPE-AWARE)
// =====================================
// Shared with GET /auth/me/permissions and the role-access socket refresh
// so this resolution logic only lives in one place.

const { permissions, menus } = await PermissionService.resolveAccess(user, userRoles);


// =====================================
// SMALL TOKEN PAYLOAD
// =====================================

// const token=
// jwt.sign({

// userId:
// user.id,

// email:
// user.email,

// userType:
// user.userType,

// isSuperAdmin:
// user.isSuperAdmin,

// roleIds:
// userRoles.map(
// x=>x.role.id
// )

// },

// process.env.JWT_SECRET!,

// {

// expiresIn:"1d"

// }

// );

const jwtSecret = process.env.JWT_SECRET || "fallback_default_secret_key_12345";
const token = jwt.sign({

userId:user.id,

email:user.email,

userType:user.userType,

isSuperAdmin:user.isSuperAdmin,

company_id:
userRoles[0]?.company?.id ?? userRoles[0]?.company_id ?? null,

branch_id:
userRoles[0]?.branch?.id ?? userRoles[0]?.branch_id ?? null,

roles:
userRoles.map(x=>({

roleId:x.role.id,
name:x.role.name

})),

permissions,

menus

},

jwtSecret,

{

expiresIn:"1d"

}
);


// =====================================
// REMOVE PASSWORD
// =====================================

const{
password:userPassword,
...safeUser

}=user;


// =====================================
// RESPONSE
// =====================================

// permissions/menus are intentionally left out of this response —
// they stay signed inside the JWT for backend authorization, and the
// frontend fetches them fresh via GET /auth/me/permissions so a
// role-access change can be picked up without a new login.
return res.status(200)
.json({

success:true,

message:
"Login successful",

token,

user:safeUser,

roles:
userRoles.map(

r=>({

roleId:
r.role.id,

role:
r.role.name,

company:
r.company,

branch:
r.branch

})

)

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:
error.message

});

}

}

@Post("/create-superadmin")
@Swagger(
"Create SuperAdmin",
"Create first Super Admin or create additional Super Admins"
)
public async createSuperAdmin(
req:any,
res:any
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{

const userRepo=
queryRunner.manager.getRepository(
User
);

const roleRepo=
queryRunner.manager.getRepository(
Role
);

const userRoleRepo=
queryRunner.manager.getRepository(
UserRole
);


// =====================================
// CHECK EXISTING SUPER ADMINS
// =====================================

const superAdminCount=
await userRepo.count({

where:{
isSuperAdmin:true
}

});


// =====================================
// IF SUPER ADMIN EXISTS
// REQUIRE AUTH
// =====================================

if(

superAdminCount>0 &&

!req.user?.isSuperAdmin

){

if(
queryRunner.isTransactionActive
){

await queryRunner.rollbackTransaction();

}

return res.status(403)
.json({

success:false,

message:
"Only Super Admin can create another Super Admin"

});

}


// =====================================
// REQUEST BODY
// =====================================

const{

name,
email,
password,
mobilenumber

}=req.body;


// =====================================
// VALIDATION
// =====================================

if(

!name ||
!email ||
!password ||
!mobilenumber

){

if(
queryRunner.isTransactionActive
){

await queryRunner.rollbackTransaction();

}

return res.status(400)
.json({

success:false,

message:
"All fields are required"

});

}


if(
password.length<6
){

if(
queryRunner.isTransactionActive
){

await queryRunner.rollbackTransaction();

}

return res.status(400)
.json({

success:false,

message:
"Password must be at least 8 characters"

});

}


// =====================================
// EMAIL EXISTS
// =====================================

const existing=
await userRepo.findOne({

where:{
email
}

});


if(existing){

if(
queryRunner.isTransactionActive
){

await queryRunner.rollbackTransaction();

}

return res.status(400)
.json({

success:false,

message:
"Email already exists"

});

}


// =====================================
// HASH PASSWORD
// =====================================

const hashedPassword=
await bcrypt.hash(
password,
12
);


// =====================================
// CREATE USER
// =====================================

const user=
userRepo.create({

name,
email,

password:
hashedPassword,

mobilenumber,

isSuperAdmin:true,

userType:
UserType.SUPER_ADMIN,

mustChangePassword:false,

isActive:true

});


const savedUser=
await userRepo.save(
user);


// =====================================
// GET ROLE
// =====================================

let superRole=
await roleRepo.findOne({

where:{

name:
"Super_Admin"

}

});


// =====================================
// CREATE ROLE IF MISSING
// =====================================

if(!superRole){

superRole=
roleRepo.create({

name:
"Super_Admin",

isActive:true

});

superRole=
await roleRepo.save(
superRole);

}


// =====================================
// ASSIGN ROLE
// =====================================

const userRole=
userRoleRepo.create({

user:{
id:savedUser.id
},

role:{
id:superRole.id
}

});

await userRoleRepo.save(
userRole);


// =====================================
// COMMIT
// =====================================

await queryRunner.commitTransaction();


// =====================================
// REMOVE PASSWORD
// =====================================

const{
password:removedPassword,
...safeUser

}=savedUser;


// =====================================
// RESPONSE
// =====================================

return res.status(201)
.json({

success:true,

message:
"Super Admin created successfully",

data:{

...safeUser,

role:
superRole.name

}

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

/**
 * SELECT CONTEXT
 */
@Post("/select-context")
@Middleware([authenticateMiddleware])
@Swagger("Select Context", "Company + Branch + Role selection")
public async selectContext(
  req: any,
  res: any
) {

  const {
    user_id,
    company_id,
    branch_id,
    role_id
  } = req.body;

  try {

    const userRepo =
      dataSource.getRepository(User);

    const permissionRepo =
      dataSource.getRepository(Permission);

    const rolePermissionRepo =
      dataSource.getRepository(RolePermission);

    const user =
      await userRepo.findOne({
        where: {
          id: user_id
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let permissions: any[] = [];
    let menus: any[] = [];

    // ===============================
    // SUPER ADMIN => FULL ACCESS
    // ===============================
    if (
      user.userType === UserType.SUPER_ADMIN ||
      user.isSuperAdmin === true
    ) {

      permissions =
        await permissionRepo.find({
          relations: {
            menu: true
          }
        });

      menus = permissions.map((p: any) => ({
        id: p.menu.id,
        name: p.menu.name,
        path: p.menu.path,
        icon: p.menu.icon
      }));

    }

    // ===============================
    // NORMAL USER => ROLE ACCESS
    // ===============================
    else {

      if (!role_id) {
        return res.status(400).json({
          success: false,
          message: "Role Id required"
        });
      }

      const rolePermissions =
        await rolePermissionRepo.find({
          where: {
            role_id
          },
          relations: {
            permission: {
              menu: true
            }
          }
        });

      permissions = rolePermissions.map(
        (rp: any) => rp.permission
      );

      menus = rolePermissions.map(
        (rp: any) => ({
          id: rp.permission.menu.id,
          name: rp.permission.menu.name,
          path: rp.permission.menu.path,
          icon: rp.permission.menu.icon
        })
      );
    }

    // Remove duplicate menus
    menus = menus.filter(
      (menu, index, self) =>
        index ===
        self.findIndex(
          m => m.id === menu.id
        )
    );

    // Create token
    const token = jwt.sign(
      {
        user_id,
        company_id,
        branch_id,
        role_id,

        userType: user.userType,
        isSuperAdmin: user.isSuperAdmin,

        permissions,
        menus
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Context selected",

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isSuperAdmin: user.isSuperAdmin
      },

      menus,
      permissions
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}


@Post("/create-user")
@Middleware([
authenticateMiddleware
])
public async createUser(
req:any,
res:any
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();
await queryRunner.startTransaction();

try{


// Only super admin

if(
!req.user?.isSuperAdmin
){

await queryRunner.rollbackTransaction();

return res.status(403)
.json({

success:false,
message:
"Only Super Admin can create users"

});

}


const{

name,
email,
mobilenumber,
userType,
role_id,
company_id,
branch_id

}=req.body;


const userRepo=
queryRunner.manager.getRepository(
User
);

const roleMapRepo=
queryRunner.manager.getRepository(
UserRole
);

const roleRepo=
queryRunner.manager.getRepository(
Role
);

const companyRepo=
queryRunner.manager.getRepository(
Company
);

const branchRepo=
queryRunner.manager.getRepository(
Branch
);


// email exists

const exists=
await userRepo.findOne({

where:{
email
}

});

if(exists){

await queryRunner.rollbackTransaction();

return res.status(409)
.json({

success:false,
message:
"Email already exists"

});

}


// validate role

const role=
await roleRepo.findOne({

where:{
id:role_id
}

});

if(!role){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:
"Role not found"

});

}


// validate company

if(company_id){

const company=
await companyRepo.findOne({

where:{
id:company_id
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

}


// validate branch

if(branch_id){

const branch=
await branchRepo.findOne({

where:{
id:branch_id
}

});

if(!branch){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:
"Branch not found"

});

}

}


// generate password

const tempPassword=
generateTempPassword();

const hashedPassword=
await bcrypt.hash(
tempPassword,
12
);


// create user

const user=
userRepo.create({

name,
email,
mobilenumber,

password:
hashedPassword,

userType,

mustChangePassword:true,

isActive:true,

isSuperAdmin:false

});


const savedUser=
await userRepo.save(
user
);


// assign role

await roleMapRepo.save({

user:{
id:savedUser.id
},

role:{
id:role_id
},

company:
company_id
?{
id:company_id
}
:undefined,

branch:
branch_id
?{
id:branch_id
}
:undefined

});


await queryRunner.commitTransaction();


// send mail outside transaction

EmailService
.sendTemporaryPassword(

email,
tempPassword,
name

).catch(console.error);


return res.status(201)
.json({

success:true,
message:
`${userType} created successfully`

});

}
catch(error:any){

await queryRunner.rollbackTransaction();

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

@Get("/") @Middleware([ authenticateMiddleware ]) 
public async getUsers( req:any, res:any )
{ 
  try{
    const repo = dataSource.getRepository(User);

    if (req.user.isSuperAdmin) {
      const users = await repo.find();
      return res.status(200).json({ success: true, count: users.length, data: users });
    }

    const qb = repo.createQueryBuilder("user")
      .innerJoin("user.userRoles", "ur");

    if (req.user.companyId) {
      qb.andWhere("ur.company_id = :companyId", { companyId: req.user.companyId });
    }

    if (req.user.branchId) {
      qb.andWhere("ur.branch_id = :branchId", { branchId: req.user.branchId });
    }

    const users = await qb.getMany();

    return res.status(200).json({
       success:true,
       count:users.length,
       data:users
      });
    } catch(error:any){
       return res.status(500).json({
        success:false,
        message:error.message
      });
    }
  }

  @Get("/:id") @Middleware([ authenticateMiddleware ])
  public async getUserById( req:any, res:any )
  { try
    { const user= await dataSource .getRepository(User) .findOne({ where:{ id:Number( req.params.id ) } }); 
    if(!user){ return res.status(404).json({
       success:false, 
       message:"User not found" 
      }); 
    } return res.status(200).json({
       success:true, 
       data:user }); 
      } catch(error:any){ 
        return res.status(500).json({
           success:false,
            message:error.message 
          }); 
        } 
      } 
      
/* ========================= Delete User ========================= */ 
@Delete("/:id") @Middleware([ authenticateMiddleware ]) 
public async deleteUser( req:any, res:any ){ 
  try{ 
  const userRepo= dataSource.getRepository( User ); 
  const user= await userRepo.findOne({ where:{ id:Number( req.params.id )   
  } 
}); 
if(!user){ return res.status(404).json({
   success:false, 
   message:"User not found" 
  }); 
} await userRepo.delete( req.params.id ); 
return res.status(200).json({
   success:true, 
   message: "User removed successfully" 
  }); } catch(error:any){
    return res.status(500).json({
      success:false,
      message:error.message
    });
  }
}

  // =====================================================
  // ADMIN: FORCE-SET USER PASSWORD (SA only)
  // =====================================================
  @Put("/admin-set-password/:userId")
  @Middleware([authenticateMiddleware])
  public async adminSetPassword(req: any, res: any) {
    if (!req.user?.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "Super Admin only" });
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "newPassword must be at least 6 chars" });
    }
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: Number(req.params.userId) } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await userRepo.save(user);
    return res.json({ success: true, message: "Password updated" });
  }

  // =====================================================
  // MY ACCESS (LIVE ROLES/PERMISSIONS/MENUS)
  // =====================================================
  // Recomputes roles/permissions/menus straight from the DB for the
  // currently logged-in user. Called on demand by the frontend after a
  // "permissions-updated" socket signal, so a role-access change made by
  // an admin takes effect immediately without the user logging in again.
  @Get("/me/permissions")
  @Middleware([authenticateMiddleware])
  public async getMyPermissions(req: any, res: any) {
    try {
      const data = await PermissionService.getUserAccess(req.user.userId);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }
}

// ======================= Profile =======================