import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Middleware
} from "../decorators";

import dataSource from "../config/database";
import authenticateMiddleware from "../middleware/authenticate.middleware";
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
  // CREATE MENUS IN BULK
  // =====================================================
  @Post("/bulk")
  @Middleware([authenticateMiddleware])
  async createBulk(req: any, res: any) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Expected an array of menus" });
      }

      const menuRepo = queryRunner.manager.getRepository(Menu);
      const permissionRepo = queryRunner.manager.getRepository(Permission);
      const actions = Object.values(PermissionType);
      const createdMenus = [];

      for (const item of items) {
        const { name, path, icon } = item;
        
        // Skip existing to prevent conflicts in bulk insert
        const exists = await menuRepo.findOne({ where: { name } });
        if (exists) continue;

        const menu = await menuRepo.save(menuRepo.create({ name, path, icon }));
        
        const permissions = actions.map(action =>
          permissionRepo.create({ menu_id: menu.id, action })
        );
        await permissionRepo.save(permissions);
        createdMenus.push(menu);
      }

      await queryRunner.commitTransaction();

      return res.status(201).json({
        success: true,
        message: `Successfully created ${createdMenus.length} menus out of ${items.length}`,
        data: createdMenus
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

  try {

    const id = Number(req.params.id);
    const { name, path, icon } = req.body;

    const repo = dataSource.getRepository(Menu);

    const menu = await repo.findOne({
      where: { id }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });
    }

    // Prevent duplicate menu name
    if (name && name !== menu.name) {

      const exists = await repo.findOne({
        where: { name }
      });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Menu name already exists"
        });
      }
    }

    repo.merge(menu, {
      name,
      path,
      icon
    });

    await repo.save(menu);

    return res.status(200).json({
      success: true,
      message: "Menu updated successfully",
      data: menu
    });

  } catch (err: any) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
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