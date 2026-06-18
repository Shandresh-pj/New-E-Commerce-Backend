import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Middleware
} from "../decorators";

import { Response } from "express";

import authenticateMiddleware from "../middleware/authenticate";

import { dataSource } from "../server";

import {
  
    Menu,
  Permission,
  PermissionType
} from "../entities/menu";


@Controller("/menus")
export class MenuController {

  @Post("/")
  @Middleware([authenticateMiddleware])
  public async create(
    req: any,
    res: Response
  ) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const {
        name,
        path,
        icon
      } = req.body;

      const menuRepo =
        queryRunner.manager.getRepository(Menu);

      const permissionRepo =
        queryRunner.manager.getRepository(Permission);

      const existingMenu =
        await menuRepo.findOne({
          where: { name }
        });

      if (existingMenu) {

        await queryRunner.rollbackTransaction();

        return res.status(409).json({
          success: false,
          message: "Menu already exists"
        });

      }

      const menu =
        menuRepo.create({
          name,
          path,
          icon
        });

      await menuRepo.save(menu);

      const actions = [
        PermissionType.READ,
        PermissionType.WRITE,
        PermissionType.UPDATE,
        PermissionType.DELETE,
        PermissionType.APPROVE
      ];

      const permissions =
        actions.map(action =>
          permissionRepo.create({
            menu_id: menu.id,
            action
          })
        );

      await permissionRepo.save(
        permissions
      );

      await queryRunner.commitTransaction();

      return res.status(201).json({
        success: true,
        message:
          "Menu and permissions created successfully",
        menu,
        permissions
      });

    } catch (error: any) {

      await queryRunner.rollbackTransaction();

      return res.status(500).json({
        success: false,
        message: error.message
      });

    } finally {

      await queryRunner.release();

    }
  }

  @Get("/")
  @Middleware([authenticateMiddleware])
  public async getAll(
    req: any,
    res: Response
  ) {

    const menus =
      await dataSource
        .getRepository(Menu)
        .find({
          relations: {
            permissions: true
          }
        });

    return res.json({
      success: true,
      data: menus
    });
  }

  @Put("/:id")
  @Middleware([authenticateMiddleware])
  public async update(
    req: any,
    res: Response
  ) {

    const id =
      Number(req.params.id);

    const repo =
      dataSource.getRepository(Menu);

    const menu =
      await repo.findOne({
        where: { id }
      });

    if (!menu) {

      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });

    }

    repo.merge(
      menu,
      req.body
    );

    await repo.save(menu);

    return res.json({
      success: true,
      message:
        "Menu updated successfully",
      data: menu
    });
  }

  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  public async remove(
    req: any,
    res: Response
  ) {

    const id =
      Number(req.params.id);

    const repo =
      dataSource.getRepository(Menu);

    const menu =
      await repo.findOne({
        where: { id }
      });

    if (!menu) {

      return res.status(404).json({
        success: false,
        message: "Menu not found"
      });

    }

    await repo.remove(menu);

    return res.json({
      success: true,
      message:
        "Menu deleted successfully"
    });
  }


  @Get("/permissions")
@Middleware([authenticateMiddleware])
public async getAllPermissions(
  req: any,
  res: Response
) {

  try {

    const permissions =
      await dataSource
        .getRepository(Permission)
        .find({
          relations: {
            menu: true
          },
          order: {
            menu_id: "ASC"
          }
        });

    return res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}
}