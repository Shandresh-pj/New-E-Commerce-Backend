import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware
} from "../decorators";

import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { RolePermission } from "../entities/role-access";


@Controller("/role-access")
export class RoleAccessController {

  // =====================================================
  // ASSIGN ROLE PERMISSION (CREATE)
  // =====================================================
  @Post("/")
  @Middleware([authenticateMiddleware])
  async create(req: any, res: any) {

    const { role_id, permission_id } = req.body;

    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: "role_id & permission_id required"
      });
    }

    const repo = dataSource.getRepository(RolePermission);

    const exists = await repo.findOne({
      where: { role_id, permission_id }
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already assigned"
      });
    }

    const data = repo.create({ role_id, permission_id });

    await repo.save(data);

    return res.status(201).json({
      success: true,
      data
    });
  }

  // =====================================================
  // GET ALL ROLE ACCESS
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: any) {

    const data = await dataSource.getRepository(RolePermission).find({
      relations: {
        role: true,
        permission: {
          menu: true
        }
      },
      order: {
        id: "DESC"
      }
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  }

  // =====================================================
  // GET BY ROLE ID
  // =====================================================
  @Get("/role/:role_id")
  @Middleware([authenticateMiddleware])
  async getByRole(req: any, res: any) {

    const role_id = Number(req.params.role_id);

    const data = await dataSource.getRepository(RolePermission).find({
      where: { role_id },
      relations: {
        role: true,
        permission: { menu: true }
      }
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  }

  // =====================================================
  // DELETE ROLE PERMISSION
  // =====================================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  async delete(req: any, res: any) {

    const id = Number(req.params.id);

    const repo = dataSource.getRepository(RolePermission);

    const record = await repo.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Not found"
      });
    }

    await repo.remove(record);

    return res.json({
      success: true,
      message: "Deleted successfully"
    });
  }
}