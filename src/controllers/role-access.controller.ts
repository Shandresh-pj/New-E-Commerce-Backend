import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger
} from "../decorators";

import { Request, Response } from "express";
import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { RolePermission } from "../entities/role-access";
// import { RolePermission } from "../entities/role-permission";

@Controller("/role-access")
export class RoleAccessController {

  // =====================================================
  // CREATE ROLE ACCESS
  // =====================================================
  @Post("/create")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Role Access", "Assign permissions")
  public async create(req: any, res: any) {

    if (!["Super_Admin", "Admin"].includes(req.user.usertype)) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    const repo = dataSource.getRepository(RolePermission);

    const data = repo.create(req.body);

    await repo.save(data);

    return res.json({
      success: true,
      data
    });
  }

  // =====================================================
  // GET ROLE ACCESS
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Role Access", "List permissions")
  public async getAll(req: any, res: any) {

    const repo = dataSource.getRepository(RolePermission);

    const data = await repo.find();

    return res.json({
      success: true,
      data
    });
  }

  // =====================================================
  // DELETE ROLE ACCESS
  // =====================================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Role Access", "Remove permission")
  public async delete(req: any, res: any) {

    const repo = dataSource.getRepository(RolePermission);

    await repo.delete(req.params.id);

    return res.json({
      success: true,
      message: "Deleted"
    });
  }
}