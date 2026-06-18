import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger
} from "../decorators";

import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { RolePermission } from "../entities/role-access";
import { Permission } from "../entities/menu";
import { Role } from "../entities/roles";


@Controller("/role-access")
export class RoleAccessController {
  @Post("/")
@Middleware([authenticateMiddleware])
@Swagger(
  "Create Role Access",
  "Assign permission to role"
)
public async create(
  req: any,
  res: any
) {

  try {

    const {
      role_id,
      permission_id
    } = req.body;

    if (!role_id || !permission_id) {

      return res.status(400).json({
        success: false,
        message:
          "role_id and permission_id are required"
      });

    }

    const roleRepo =
      dataSource.getRepository(Role);

    const permissionRepo =
      dataSource.getRepository(Permission);

    const role =
      await roleRepo.findOne({
        where: { id: role_id }
      });

    if (!role) {

      return res.status(404).json({
        success: false,
        message: "Role not found"
      });

    }

    const permission =
      await permissionRepo.findOne({
        where: { id: permission_id }
      });

    if (!permission) {

      return res.status(404).json({
        success: false,
        message: "Permission not found"
      });

    }

    const repo =
      dataSource.getRepository(RolePermission);

    const exists =
      await repo.findOne({
        where: {
          role_id,
          permission_id
        }
      });

    if (exists) {

      return res.status(409).json({
        success: false,
        message:
          "Permission already assigned"
      });

    }

    const data =
      repo.create({
        role_id,
        permission_id
      });

    await repo.save(data);

    return res.status(201).json({
      success: true,
      message:
        "Permission assigned successfully",
      data
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error: error.message
    });

  }
}

@Get("/")
@Middleware([authenticateMiddleware])
@Swagger(
  "Get Role Access",
  "Get all role permissions"
)
public async getAll(
  req: any,
  res: any
) {

  try {

    const repo =
      dataSource.getRepository(RolePermission);

    const data =
      await repo.find({
        relations: {role : true,permission : true}
      });

    return res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message:
        "Internal server error"
    });

  }
}

@Get("/role/:role_id")
@Middleware([authenticateMiddleware])
@Swagger(
  "Get Role Permissions",
  "Get permissions by role"
)
public async getByRole(
  req: any,
  res: any
) {

  const role_id =
    Number(req.params.role_id);

  const repo =
    dataSource.getRepository(
      RolePermission
    );

  const data =
    await repo.find({
      where: { role_id },
      relations: {role : true,permission : true}
        
        
      
    });

  return res.json({
    success: true,
    data
  });
}

@Delete("/:id")
@Middleware([authenticateMiddleware])
@Swagger(
  "Delete Role Access",
  "Remove permission from role"
)
public async delete(
  req: any,
  res: any
) {

  try {

    const repo =
      dataSource.getRepository(
        RolePermission
      );

    const record =
      await repo.findOne({
        where: {
          id: Number(
            req.params.id
          )
        }
      });

    if (!record) {

      return res.status(404).json({
        success: false,
        message:
          "Role permission not found"
      });

    }

    await repo.remove(record);

    return res.json({
      success: true,
      message:
        "Permission removed successfully"
    });

  } catch (error: any) {

    return res.status(500).json({
      success: false,
      message:
        "Internal server error"
    });

  }
}
}