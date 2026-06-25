import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Middleware
} from "../decorators";

import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { Menu, Permission, PermissionType } from "../entities/menu";


@Controller("/menus")
export class MenuController {

  // =====================================================
  // CREATE MENU
  // =====================================================
  @Post("/")
  @Middleware([authenticateMiddleware])
  async create(req: any, res: any) {

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const { name, path, icon } = req.body;

      const menuRepo = queryRunner.manager.getRepository(Menu);
      const permissionRepo = queryRunner.manager.getRepository(Permission);

      const exists = await menuRepo.findOne({ where: { name } });

      if (exists) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({
          success: false,
          message: "Menu already exists"
        });
      }

      const menu = await menuRepo.save(
        menuRepo.create({ name, path, icon })
      );

      // Auto create permissions
      const actions = Object.values(PermissionType);

      const permissions = actions.map(action =>
        permissionRepo.create({
          menu_id: menu.id,
          action
        })
      );

      await permissionRepo.save(permissions);

      await queryRunner.commitTransaction();

      return res.status(201).json({
        success: true,
        data: menu,
        permissions
      });

    } catch (err: any) {

      await queryRunner.rollbackTransaction();

      return res.status(500).json({
        success: false,
        message: err.message
      });

    } finally {
      await queryRunner.release();
    }
  }

  // =====================================================
  // GET ALL MENUS
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: any) {

    const menus = await dataSource.getRepository(Menu).find({
      relations: {
        permissions: true
      },
      order: {
        id: "DESC"
      }
    });

    return res.json({
      success: true,
      data: menus
    });
  }

  // =====================================================
  // GET ONE MENU
  // =====================================================
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  async getOne(req: any, res: any) {

    const id = Number(req.params.id);

    const menu = await dataSource.getRepository(Menu).findOne({
      where: { id },
      relations: { permissions: true }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });
    }

    return res.json({
      success: true,
      data: menu
    });
  }

  // =====================================================
  // UPDATE MENU
  // =====================================================
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  async update(req: any, res: any) {

    const id = Number(req.params.id);

    const repo = dataSource.getRepository(Menu);

    const menu = await repo.findOne({ where: { id } });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });
    }

    repo.merge(menu, req.body);

    await repo.save(menu);

    return res.json({
      success: true,
      message: "Menu updated",
      data: menu
    });
  }

  // =====================================================
  // DELETE MENU
  // =====================================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  async delete(req: any, res: any) {

    const id = Number(req.params.id);

    const repo = dataSource.getRepository(Menu);

    const menu = await repo.findOne({ where: { id } });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });
    }

    await repo.remove(menu);

    return res.json({
      success: true,
      message: "Menu deleted"
    });
  }
}