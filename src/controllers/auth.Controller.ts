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

import { Register, StatusType, UserType } from "../entities/register";
import { CreateProfileDto, LoginDto, RegisterDto, UpdateProfileDto } from "../dto/register.dto";
import { Put } from "../decorators/put";

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

  @Post("/register")
  @Middleware([
    validate(RegisterDto)
  ])
  @Swagger("Register User", "Create New User")
  public async register(
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
         name,
          email,
          password,
          mobilenumber,
          address,
      } = request.body;

      const image =
        request?.file?.filename ?? '';

      const userRepository =
        queryRunner.manager.getRepository(Register);

      const existingUser =
        await userRepository.findOne({
          where: {
            email,
          },
        });

      if (existingUser) {
        await queryRunner.rollbackTransaction();

        return response.status(400).json({
          success: false,
          message:
            "Email already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        userRepository.create({
          name,
          email,
          password: hashedPassword,
          image,
          mobilenumber,
          address,
          status: StatusType.ACTIVE,
          usertype: UserType.CUSTOMER,
          logintype: "Normal",
        });

      await userRepository.save(user);

      await queryRunner.commitTransaction();

      return response.status(201).json({
        success: true,
        message:
          "User registered successfully",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
      });

    } catch (error) {

      await queryRunner.rollbackTransaction();

      next(error);

    } finally {

      await queryRunner.release();

    }
  }


@Post("/login")
@Middleware([validate(LoginDto)])
@Swagger("User Login", "Login with Email/Mobile and Password")
public async login(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const {
      email,
      mobilenumber,
      password,
    } = request.body;

    if (
      (!email && !mobilenumber) ||
      !password
    ) {
      return response.status(400).json({
        success: false,
        message:
          "Email or Mobile Number and Password are required",
      });
    }

    const userRepository =
      dataSource.getRepository(Register);

    const user =
      await userRepository
        .createQueryBuilder("user")
        .where("user.email = :email", {
          email,
        })
        .orWhere(
          "user.mobilenumber = :mobilenumber",
          {
            mobilenumber,
          }
        )
        .getOne();

    if (!user) {
      return response.status(401).json({
        success: false,
        message:
          "Invalid Email/Mobile Number",
      });
    }

    if (!user.password) {
      return response.status(401).json({
        success: false,
        message:
          "Password login is not available for this account",
      });
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordValid) {
      return response.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        mobilenumber:
          user.mobilenumber,
        usertype: user.usertype,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    return response.status(200).json({
      success: true,
      message:
        "Login Successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobilenumber: user.mobilenumber,
        image: user.image,
        usertype: user.usertype,
      },
    });
  } catch (error) {
    next(error);
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
        usertype:
          req.body.usertype,
        status:
          req.body.status,
        image
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

    const image = buildUploadedFileUrl(req.file) ?? user.image;

    await repository.update(
      Number(req.params.id),
      {
        name: req.body.name,
        email: req.body.email,
        mobilenumber:
          req.body.mobilenumber,
        address:
          req.body.address,
        usertype:
          req.body.usertype,
        status:
          req.body.status,
        image
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