import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger
} from "../decorators";

import { Request, Response } from "express";
import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { Role } from "../entities/roles";


@Controller("/roles")
export class RoleController {

  // =====================================================
  // CREATE ROLE
  // =====================================================
  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Role", "Create new role")
  public async create(req: any, res: any) {

    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        message: "Only SuperAdmin can create roles"
      });
    }

    const repo = dataSource.getRepository(Role);

    const role = repo.create(req.body);

    await repo.save(role);

    return res.json({
      success: true,
      data: role
    });
  }

  // =====================================================
  // GET ALL ROLES
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Roles", "List all roles")
  public async getAll(req: any, res: any) {

    const repo = dataSource.getRepository(Role);

    const roles = await repo.find();

    return res.json({
      success: true,
      data: roles
    });
  }
}