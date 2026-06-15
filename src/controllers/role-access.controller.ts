import {
  Request,
  Response,
} from "express";

import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import { Put } from "../decorators/put";

import validate from "../middleware/validate";


import {
  dataSource,
} from "../server";
import { CreateRoleAccessDto } from "../dto/role-access.dto";
import { RoleAccess } from "../entities/role-access";

@Controller("/role-access")
export class RoleAccessController {

  // ==========================================
  // CREATE
  // ==========================================

  @Post("/create")
  @Middleware([
    validate(CreateRoleAccessDto)
  ])
  @Swagger(
    "Create Role Access",
    "Create module permission"
  )
  async create(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        RoleAccess
      );

    const role =
      repo.create(req.body);

    await repo.save(role);

    return res.json({
      success: true,
      data: role,
    });
  }

  // ==========================================
  // GET ALL
  // ==========================================

  @Get("/")
  @Swagger(
    "Role Access List",
    "Get all permissions"
  )
  async getAll(
    req: Request,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(RoleAccess)
        .find({
          order: {
            id: "DESC",
          },
        });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // GET ONE
  // ==========================================

  @Get("/:id")
  async getOne(
    req: Request,
    res: Response
  ) {

    const role =
      await dataSource
        .getRepository(RoleAccess)
        .findOne({
          where: {
            id: Number(
              req.params.id
            ),
          },
        });

    return res.json({
      success: true,
      data: role,
    });
  }

  // ==========================================
  // UPDATE
  // ==========================================

  @Put("/:id")
  async update(
    req: Request,
    res: Response
  ) {

    await dataSource
      .getRepository(RoleAccess)
      .update(
        req.params.id,
        req.body
      );

    return res.json({
      success: true,
      message:
        "Role access updated",
    });
  }

  // ==========================================
  // DELETE
  // ==========================================

  @Delete("/:id")
  async delete(
    req: Request,
    res: Response
  ) {

    await dataSource
      .getRepository(RoleAccess)
      .delete(
        req.params.id
      );

    return res.json({
      success: true,
      message:
        "Role access deleted",
    });
  }
}