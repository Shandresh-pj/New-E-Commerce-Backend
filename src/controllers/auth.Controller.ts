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

import { dataSource } from "../server";
import jwt from "jsonwebtoken";

import { Register } from "../entities/register";
import { CreateProfileDto, LoginDto, RegisterDto, UpdateProfileDto } from "../dto/register.dto";
import { Put } from "../decorators/put";
import authenticateMiddleware from "../middleware/authenticate";
import { generateToken } from "../utils/jwt";
// import { permissionGuard } from "../middleware/permissionGuard.middleware";
import { User, UserRole } from "../entities/user";
import { RolePermission } from "../entities/role-access";
import { EmailService, generateTempPassword } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";
import { Menu, Permission } from "../entities/menu";
import { Role } from "../entities/roles";

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
  @Middleware([validate(RegisterDto)]) // ❌ NO AUTH MIDDLEWARE
  @Swagger("Register User", "Customer registration")
  public async register(req: any, res: any, next: NextFunction) {

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const { name, email, password, mobilenumber } = req.body;

      const userRepo = queryRunner.manager.getRepository(User);
      const roleRepo = queryRunner.manager.getRepository(UserRole);

      const exists = await userRepo.findOne({ where: { email } });

      if (exists) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }

      const hashed = await bcrypt.hash(password, 10);

      const user = userRepo.create({
        name,
        email,
        password: hashed,
        mobilenumber,
        userType: UserType.CUSTOMER,
        isSuperAdmin: false,
        mustChangePassword: true,
        isActive: true
      });

      await userRepo.save(user);

      await roleRepo.save({
        user_id: user.id,
        role_id: 7,
        company_id: 1
      });

      await queryRunner.commitTransaction();

      return res.json({
        success: true,
        message: "User registered successfully",
        data: user
      });

    } catch (err) {
      await queryRunner.rollbackTransaction();
      next(err);
    } finally {
      await queryRunner.release();
    }
  }


  /**
   * LOGIN USER
   */
@Post("/login")
@Middleware([validate(LoginDto)])
public async login(
  req: Request,
  res: Response
) {

  try {

    const {
      email,
      password
    } = req.body;

    const userRepo =
      dataSource.getRepository(User);

    const userRoleRepo =
      dataSource.getRepository(UserRole);

    const rolePermissionRepo =
      dataSource.getRepository(RolePermission);

    const permissionRepo =
      dataSource.getRepository(Permission);

    const menuRepo =
      dataSource.getRepository(Menu);

    const roleRepo =
      dataSource.getRepository(Role);

    const user =
      await userRepo.findOne({

        where: {
          email
        }
      });

    if (!user) {

      return res.status(401).json({

        success: false,
        message:
          "Invalid email or password"
      });
    }

    const matched =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!matched) {

      return res.status(401).json({

        success: false,
        message:
          "Invalid email or password"
      });
    }

    let roles: any[] = [];
    let permissions: any[] = [];
    let menus: any[] = [];

    // ==================================
    // SUPER ADMIN
    // ==================================

    if (

      user.userType ===
      UserType.SUPER_ADMIN ||

      user.isSuperAdmin === true

    ) {

      const superRole =
        await roleRepo.findOne({

          where: {
            name:
              "Super_Admin"
          }
        });

      if (superRole) {

        roles = [
          superRole
        ];
      }

      permissions =
        await permissionRepo.find({

          relations: {
            menu: true
          }
        });

      menus =
        await menuRepo.find();

    }

    // ==================================
    // NORMAL USER
    // ==================================

    else {

      roles =
        await userRoleRepo.find({

          where: {
            user_id:
              user.id
          },

          relations: {

            role: true,

            company: true,

            branch: true
          }
        });

      const roleIds =
        roles.map(
          x => x.role_id
        );

      const rolePermissions =
        await rolePermissionRepo.find({

          where:
            roleIds.map(
              id => ({
                role_id: id
              })
            ),

          relations: {

            permission: {
              menu: true
            }
          }
        });

      permissions =
        rolePermissions.map(
          (x: any) =>
            x.permission
        );

      menus =
        permissions.map(
          (x: any) =>
            x.menu
        );

      menus =
        menus.filter(

          (
            menu,
            index,
            self
          ) =>

            index ===
            self.findIndex(
              m =>
              m.id ===
              menu.id
            )
        );
    }

    // Create token

    const token =
      jwt.sign({

        userId:
          user.id,

        email:
          user.email,

        userType:
          user.userType,

        isSuperAdmin:
          user.isSuperAdmin,

        permissions,

        menus

      },
      process.env.JWT_SECRET!,
      {

        expiresIn:
          "1d"
      });

    return res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        userType:
          user.userType,

        isSuperAdmin:
          user.isSuperAdmin
      },

      roles,

      permissions,

      menus
    });

  }

  catch (error: any) {

    return res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

@Post("/create-superadmin")
@Swagger(
  "Create SuperAdmin",
  "Create Super Admin with role assignment"
)
public async createSuperAdmin(
  req: any,
  res: any
) {

  try {

    const {
      name,
      email,
      password,
      mobilenumber
    } = req.body;

    const userRepo =
      dataSource.getRepository(User);

    const roleRepo =
      dataSource.getRepository(Role);

    const userRoleRepo =
      dataSource.getRepository(UserRole);

    // Check existing user

    const existing =
      await userRepo.findOne({
        where: { email }
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists"
      });
    }

    // Hash password

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // Create Super Admin user

    const user =
      userRepo.create({

        name,
        email,
        password:
          hashedPassword,

        mobilenumber,

        isSuperAdmin: true,

        userType:
          UserType.SUPER_ADMIN,

        mustChangePassword: false,

        isActive: true
      });

    await userRepo.save(user);

    // Find Super_Admin role

    let superRole =
      await roleRepo.findOne({
        where: {
          name:
            "Super_Admin"
        }
      });

    // Create role if not exists

    if (!superRole) {

      superRole =
        roleRepo.create({

          name:
            "Super_Admin",

          isActive:
            true
        });

      await roleRepo.save(
        superRole
      );
    }

    // Assign role to user

    const userRole =
      userRoleRepo.create({

        user_id:
          user.id,

        role_id:
          superRole.id
      });

    await userRoleRepo.save(
      userRole
    );

    return res.status(201).json({

      success: true,

      message:
        "Super Admin created successfully",

      data: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        userType:
          user.userType,

        role:
          superRole.name,

        isSuperAdmin:
          user.isSuperAdmin
      }
    });

  } catch (error: any) {

    return res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

/**
 * SELECT CONTEXT
 */
@Post("/select-context")
@Middleware([authenticateMiddleware])
@Swagger(
  "Select Context",
  "Company + Branch + Role selection"
)
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
@Middleware([authenticateMiddleware])
public async createUser(
  req: any,
  res: any
) {

  try {

    if (!req.user?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create users"
      });
    }

    const {
      name,
      email,
      mobilenumber,
      userType,
      role_id,
      company_id,
      branch_id
    } = req.body;

    const userRepo =
      dataSource.getRepository(User);

    const roleRepo =
      dataSource.getRepository(UserRole);

    const exists =
      await userRepo.findOne({
        where: { email }
      });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    const tempPassword =
      generateTempPassword();

    const hashedPassword =
      await bcrypt.hash(
        tempPassword,
        12
      );

    const user =
      userRepo.create({
        name,
        email,
        mobilenumber,
        password: hashedPassword,
        userType,
        mustChangePassword: true,
        isActive: true
      });

    await userRepo.save(user);

    await roleRepo.save({
      user_id: user.id,
      role_id,
      company_id,
      branch_id
    });

    await EmailService.sendTemporaryPassword(
      email,
      tempPassword,
      name
    );

    return res.status(201).json({
      success: true,
      message: `${userType} created successfully`
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ======================= Profile =======================



 @Post("/")
  @Middleware([validate(CreateProfileDto)])
  @Swagger(
    "Create Profile",
    "Create User Profile"
  )
  public async create(
    req: Request,
    res: Response
  ) {

    const repository =
      dataSource.getRepository(Register);

    const exist =
      await repository.findOne({
        where: {
          email: req.body.email
        }
      });

    if (exist) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists"
      });
    }

    const password =
      await bcrypt.hash(
        req.body.password,
        10
      );

    const image = buildUploadedFileUrl(req.file);

    const user =
      repository.create({
        name: req.body.name,
        email: req.body.email,
        password,
        mobilenumber:
          req.body.mobilenumber,
        address:
          req.body.address,
        status:
          req.body.status
      });

    await repository.save(user);

    return res.status(201).json({
      success: true,
      message:
        "Profile created successfully",
      data: user
    });
  }

  // GET PROFILE BY ID

  @Get("/:id")
  @Swagger(
    "Get Profile",
    "Get Profile By Id"
  )
  public async getById(
    req: Request,
    res: Response
  ) {

    const repository =
      dataSource.getRepository(Register);

    const user =
      await repository.findOne({
        where: {
          id: Number(req.params.id)
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found"
      });
    }

    return res.json({
      success: true,
      data: user
    });
  }

  // GET ALL

  @Get("/")
  @Swagger(
    "Get All Profiles",
    "Get All Profiles"
  )
  public async getAll(
    req: Request,
    res: Response
  ) {

    const repository =
      dataSource.getRepository(Register);

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const [users, total] =
      await repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: {
          id: "DESC"
        }
      });

    return res.json({
      success: true,
      page,
      limit,
      total,
      data: users
    });
  }

  // UPDATE

  @Put("/:id")
  @Middleware([
    validate(UpdateProfileDto)
  ])
  @Swagger(
    "Update Profile",
    "Update User Profile"
  )
  public async update(
    req: Request,
    res: Response
  ) {

    const repository =
      dataSource.getRepository(Register);

    const user =
      await repository.findOne({
        where: {
          id: Number(req.params.id)
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found"
      });
    }

    // let image = user.image;

    // if (req.file) {
    //   image =
    //     `/uploads/${req.file.filename}`;
    // }

    await repository.update(
      Number(req.params.id),
      {
        name: req.body.name,
        email: req.body.email,
        mobilenumber:
          req.body.mobilenumber,
        address:
          req.body.address,
        // usertype:
        //   req.body.usertype,
        status:
          req.body.status,
        // image
      }
    );

    return res.json({
      success: true,
      message:
        "Profile updated successfully"
    });
  }

  // DELETE

  @Delete("/:id")
  @Swagger(
    "Delete Profile",
    "Delete User Profile"
  )
  public async delete(
    req: Request,
    res: Response
  ) {

    const repository =
      dataSource.getRepository(Register);

    const result =
      await repository.delete(
        Number(req.params.id)
      );

    if (!result.affected) {
      return res.status(404).json({
        success: false,
        message:
          "User not found"
      });
    }

    return res.json({
      success: true,
      message:
        "User deleted successfully"
    });
  }
}