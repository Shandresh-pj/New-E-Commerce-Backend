import { Request, Response, NextFunction } from "express";
import { Controller, Get, Post, Delete, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate";
import { dataSource } from "../server";
import { generateToken } from "../utils/jwt";
import { UserRole } from "../entities/user";
import { RolePermission } from "../entities/role-access";
@Controller("/admin")
export class AdminController {

  // =====================================================
  // GET USER ACCESS (VIEW USER ROLES)
  // =====================================================
  @Get("/users/:id/access")
  @Middleware([authenticateMiddleware])
  public async getUserAccess(req: any, res: Response, next: NextFunction) {
    try {
      const user_id = Number(req.params.id);

      // 🔥 ONLY SUPERADMIN OR SAME USER
      if (!req.user.isSuperAdmin && req.user.user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      const accessRepo = dataSource.getRepository(UserRole);

      const access = await accessRepo.find({
        where: { user_id },
      });

      return res.json({
        success: true,
        data: access,
      });

    } catch (err) {
      next(err);
    }
  }

  // =====================================================
  // ASSIGN ROLE (CREATE USER ACCESS)
  // =====================================================
  @Post("/user-access")
  @Middleware([authenticateMiddleware])
  public async assignRole(req: any, res: Response) {
    try {
      // 🔥 ONLY SUPERADMIN CAN ASSIGN
      if (!req.user.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only Superadmin can assign roles",
        });
      }

      const {
        user_id,
        company_id,
        branch_id,
        role_id,
      } = req.body;

      const repo = dataSource.getRepository(UserRole);

      const newAccess = repo.create({
        user_id,
        company_id,
        branch_id,
        role_id,
      });

      await repo.save(newAccess);

      return res.json({
        success: true,
        message: "Role assigned successfully",
        data: newAccess,
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // =====================================================
  // DELETE USER ACCESS (REMOVE ROLE)
  // =====================================================
  @Delete("/user-access/:id")
  @Middleware([authenticateMiddleware])
  public async removeUserAccess(req: any, res: Response) {
    try {
      // 🔥 ONLY SUPERADMIN
      if (!req.user.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only Superadmin can remove access",
        });
      }

      const accessId = Number(req.params.id);

      const repo = dataSource.getRepository(UserRole);

      await repo.delete({ id: accessId });

      return res.json({
        success: true,
        message: "User access removed",
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  
@Post("/select-context")
public async selectContext(req: any, res: any) {
  const { userId, companyId, branchId, roleId } = req.body;

  const rolePermissionRepo = dataSource.getRepository(RolePermission);

  const permissions = await rolePermissionRepo
    .createQueryBuilder("rp")
    .leftJoin("rp.menu", "menu")
    .leftJoin("rp.permission", "permission")
    .where("rp.roleId = :roleId", { roleId })
    .select([
      "menu.name AS menu",
      "permission.name AS permission",
    ])
    .getRawMany();

  const token = generateToken({
    userId,
    companyId,
    branchId,
    roleId,
    permissions,
  });

  return res.json({
    token,
    message: "Login successful",
  });
}
}