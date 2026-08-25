import { Raw } from "typeorm";
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

      const { name, path, icon, webIcon, appIcon } = req.body;
      const cleanName = String(name || '').trim();
      const cleanPath = String(path || '').trim();
      const finalWebIcon = webIcon !== undefined ? webIcon : (icon || null);
      const finalAppIcon = appIcon !== undefined ? appIcon : (icon || null);
      const finalIcon = icon !== undefined ? icon : (webIcon || appIcon || null);

      if (!cleanName || !cleanPath) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: "Menu name and route path are required"
        });
      }

      const menuRepo = queryRunner.manager.getRepository(Menu);
      const permissionRepo = queryRunner.manager.getRepository(Permission);

      const existsName = await menuRepo.findOne({
        where: { name: Raw(alias => `LOWER(${alias}) = :name`, { name: cleanName.toLowerCase() }) }
      });

      if (existsName) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({
          success: false,
          message: "A menu with this name already exists"
        });
      }

      const existsPath = await menuRepo.findOne({
        where: { path: Raw(alias => `LOWER(${alias}) = :path`, { path: cleanPath.toLowerCase() }) }
      });

      if (existsPath) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({
          success: false,
          message: "A menu with this route path already exists"
        });
      }

      const menu = await menuRepo.save(
        menuRepo.create({
          name: cleanName,
          path: cleanPath,
          icon: finalIcon,
          webIcon: finalWebIcon,
          appIcon: finalAppIcon
        })
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
        const name = String(item.name || '').trim();
        const path = String(item.path || '').trim();
        const icon = item.icon || '';
        const webIcon = item.webIcon || icon || '';
        const appIcon = item.appIcon || icon || '';
        if (!name || !path) continue;

        // Skip existing to prevent conflicts in bulk insert
        const existsName = await menuRepo.findOne({
          where: { name: Raw(alias => `LOWER(${alias}) = :name`, { name: name.toLowerCase() }) }
        });
        const existsPath = await menuRepo.findOne({
          where: { path: Raw(alias => `LOWER(${alias}) = :path`, { path: path.toLowerCase() }) }
        });

        if (existsName || existsPath) continue;

        const menu = await menuRepo.save(menuRepo.create({ name, path, icon, webIcon, appIcon }));
        
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
  // GET ALL MENUS (AUTO-ENSURING FULL PERMISSION ENTRIES)
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: any) {
    try {
      const menuRepo = dataSource.getRepository(Menu);
      const permissionRepo = dataSource.getRepository(Permission);
      const actions = Object.values(PermissionType);

      const menus = await menuRepo.find({
        relations: {
          permissions: true
        },
        order: {
          id: "ASC"
        }
      });

      for (const m of menus) {
        if (!m.permissions || m.permissions.length === 0) {
          const newPerms = actions.map(action => permissionRepo.create({ menu_id: m.id, action }));
          await permissionRepo.save(newPerms);
          m.permissions = newPerms;
        } else if (m.permissions.length < actions.length) {
          const existingActions = new Set(m.permissions.map(p => p.action));
          const missingActions = actions.filter(act => !existingActions.has(act as any));
          if (missingActions.length > 0) {
            const addedPerms = missingActions.map(action => permissionRepo.create({ menu_id: m.id, action }));
            await permissionRepo.save(addedPerms);
            m.permissions.push(...addedPerms);
          }
        }
      }

      return res.json({
        success: true,
        data: menus
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  // =====================================================
  // GET ONE MENU
  // =====================================================
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  async getOne(req: any, res: any) {
    try {
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
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch menu" });
    }
  }

  // =====================================================
  // UPDATE MENU
  // =====================================================
@Put("/:id")
@Middleware([authenticateMiddleware])
async update(req: any, res: any) {

  try {

    const id = Number(req.params.id);
    const { name, path, icon, webIcon, appIcon } = req.body;
    const cleanName = name !== undefined ? String(name).trim() : undefined;
    const cleanPath = path !== undefined ? String(path).trim() : undefined;

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

    if (cleanName && cleanName.toLowerCase() !== (menu.name || '').toLowerCase()) {
      const existsName = await repo.findOne({
        where: { name: Raw(alias => `LOWER(${alias}) = :name`, { name: cleanName.toLowerCase() }) }
      });

      if (existsName) {
        return res.status(409).json({
          success: false,
          message: "A menu with this name already exists"
        });
      }
    }

    if (cleanPath && cleanPath.toLowerCase() !== (menu.path || '').toLowerCase()) {
      const existsPath = await repo.findOne({
        where: { path: Raw(alias => `LOWER(${alias}) = :path`, { path: cleanPath.toLowerCase() }) }
      });

      if (existsPath) {
        return res.status(409).json({
          success: false,
          message: "A menu with this route path already exists"
        });
      }
    }

    repo.merge(menu, {
      ...(cleanName !== undefined && { name: cleanName }),
      ...(cleanPath !== undefined && { path: cleanPath }),
      ...(icon !== undefined && { icon }),
      ...(webIcon !== undefined && { webIcon }),
      ...(appIcon !== undefined && { appIcon })
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
    try {
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
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to delete menu" });
    }
  }
}