import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Put
} from "../decorators";

import dataSource from "../config/database";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { RolePermission } from "../entities/role-access";
import { Menu, Permission } from "../entities/menu";
import { UserRole } from "../entities/user";
import { StatusType, UserType } from "../utils/Role-Access";
import { approveGuard } from "../middleware/approve.middleware";
import { IsNull, Not } from "typeorm";
import { emitToUser } from "../socket/socket";

// Pushes a "permissions-updated" signal (no payload data — the client
// re-fetches via GET /auth/me/permissions) to every user affected by a
// role-access change: the single targeted user for an employee-level row,
// or everyone holding that role at that company/branch scope otherwise.
async function notifyAffectedUsers(record: Pick<RolePermission, "role_id" | "company_id" | "branch_id" | "user_id">) {
  try {
    if (record.user_id) {
      emitToUser(record.user_id, "permissions-updated", { reason: "role-access-changed" });
      return;
    }

    const where: any = { role_id: record.role_id };
    if (record.company_id != null) where.company_id = record.company_id;
    if (record.branch_id != null) where.branch_id = record.branch_id;

    const affected = await dataSource.getRepository(UserRole).find({ where });
    const userIds = new Set(affected.map(ur => ur.user_id));

    for (const uid of userIds) {
      emitToUser(uid, "permissions-updated", { reason: "role-access-changed" });
    }
  } catch (e) {
    console.error("Failed to notify affected users of permission change:", e);
  }
}

// Normalizes the scope columns so "", 0 and undefined all become null,
// and enforces the hierarchy: branch needs a company, employee needs a branch.
function parseScope(body: any):
  | { company_id: number | null; branch_id: number | null; user_id: number | null }
  | string {

  const company_id = body.company_id ? Number(body.company_id) : null;
  const branch_id  = body.branch_id  ? Number(body.branch_id)  : null;
  const user_id    = body.user_id    ? Number(body.user_id)    : null;

  if (branch_id && !company_id) {
    return "company_id is required when branch_id is given";
  }

  if (user_id && (!company_id || !branch_id)) {
    return "company_id and branch_id are required when user_id is given";
  }

  return { company_id, branch_id, user_id };
}

// TypeORM needs IsNull() (not null) to match NULL columns in a WHERE clause
function scopeWhere(scope: { company_id: number | null; branch_id: number | null; user_id: number | null }) {
  return {
    company_id: scope.company_id ?? IsNull(),
    branch_id:  scope.branch_id  ?? IsNull(),
    user_id:    scope.user_id    ?? IsNull(),
  };
}


@Controller("/role-access")
export class RoleAccessController {

  // =====================================================
  // ASSIGN ROLE PERMISSION (CREATE)
  // =====================================================
  @Post("/")
  @Middleware([authenticateMiddleware])
  async create(req: any, res: any) {

    if (
      Array.isArray(req.body) ||
      Array.isArray(req.body.grants) ||
      Array.isArray(req.body.revokes) ||
      Array.isArray(req.body.permissions)
    ) {
      return this.batch(req, res);
    }

    const { role_id, permission_id, canApprove } = req.body;

    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: "role_id & permission_id required"
      });
    }

    const scope = parseScope(req.body);

    if (typeof scope === "string") {
      return res.status(400).json({
        success: false,
        message: scope
      });
    }

    const repo = dataSource.getRepository(RolePermission);

    const exists = await repo.findOne({
      where: { role_id, permission_id, ...scopeWhere(scope) }
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already assigned"
      });
    }

    const data = repo.create({
      role_id,
      permission_id,
      company_id: scope.company_id,
      branch_id: scope.branch_id,
      user_id: scope.user_id,
      canApprove: !!canApprove,
      // created directly by Super Admin — no separate approval step needed
      status: StatusType.ACTIVE
    } as Partial<RolePermission>);

    await repo.save(data);

    await notifyAffectedUsers(data);

    return res.status(201).json({
      success: true,
      data
    });
  }


   // ==========================================
  // UPDATE ROLE PERMISSION
  // ==========================================

  @Put("/:id")
  @Middleware([authenticateMiddleware])
  async update(req: any, res: any) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {

      const id =
        Number(req.params.id);

      const {
        role_id,
        permission_id,
        canApprove
      } = req.body;

      if (!role_id || !permission_id) {

        await queryRunner.rollbackTransaction();

        return res.status(400).json({

          success: false,
          message:
            "role_id & permission_id required"

        });

      }

      const scope = parseScope(req.body);

      if (typeof scope === "string") {

        await queryRunner.rollbackTransaction();

        return res.status(400).json({

          success: false,
          message: scope

        });

      }

      const repo =
        queryRunner.manager.getRepository(
          RolePermission
        );

      const record =
        await repo.findOne({

          where: {
            id
          }

        });

      if (!record) {

        await queryRunner.rollbackTransaction();

        return res.status(404).json({

          success: false,
          message:
            "Role access not found"

        });

      }

      const duplicate =
        await repo.findOne({

          where: {

            role_id,
            permission_id,
            ...scopeWhere(scope)

          }

        });

      if (
        duplicate &&
        duplicate.id !== id
      ) {

        await queryRunner.rollbackTransaction();

        return res.status(409).json({

          success: false,
          message:
            "Already exists"

        });

      }

      const previousScope = {
        role_id: record.role_id,
        company_id: record.company_id,
        branch_id: record.branch_id,
        user_id: record.user_id,
      };

      record.role_id =
        role_id;

      record.permission_id =
        permission_id;

      record.company_id =
        scope.company_id as any;

      record.branch_id =
        scope.branch_id as any;

      record.user_id =
        scope.user_id as any;

      if (canApprove !== undefined) {

        record.canApprove =
          !!canApprove;

      }

      await repo.save(
        record
      );

      await queryRunner.commitTransaction();

      // Notify both the old and new scope in case the update moved the
      // grant to a different role/company/branch/user.
      await notifyAffectedUsers(previousScope);
      await notifyAffectedUsers(record);

      return res.json({

        success: true,
        message:
          "Role access updated successfully",

        data: record

      });

    }
    catch (error: any) {

      await queryRunner.rollbackTransaction();

      return res.status(500).json({

        success: false,
        message:
          error.message

      });

    }
    finally {

      await queryRunner.release();

    }

  }


  // =====================================================
  // GET ALL ROLE ACCESS
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: any) {

    // Optional filters so the permission form can pre-fill an exact scope:
    // ?menu_id=&role_id=&company_id=&branch_id=&user_id=&level=admin|branch|employee|global
    const { menu_id, role_id, company_id, branch_id, user_id, level } = req.query;

    const where: any = {};

    if (menu_id)     where.permission = { menu_id: Number(menu_id) };
    if (role_id)     where.role_id    = Number(role_id);
    if (company_id)  where.company_id = Number(company_id);
    if (branch_id)   where.branch_id  = Number(branch_id);
    if (user_id)     where.user_id    = Number(user_id);

    if (level === "global")   { where.company_id = IsNull(); where.branch_id = IsNull(); where.user_id = IsNull(); }
    if (level === "admin")    { where.branch_id  = IsNull(); where.user_id   = IsNull(); }
    if (level === "branch")   { where.user_id    = IsNull(); }
    if (level === "employee" && !user_id) { where.user_id = Not(IsNull()); }

    // Tenant scoping: non-SA users only see records for their own company
    const u = req.user;
    if (!u.isSuperAdmin && u.userType !== UserType.SUPER_ADMIN) {
      if (u.companyId) where.company_id = u.companyId;
      if (u.branchId)  where.branch_id  = u.branchId;
    }

    const data = await dataSource.getRepository(RolePermission).find({
      where,
      relations: {
        role: true,
        user: true,
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

    // Non-SA users may only delete records scoped to their own company/branch
    const u = req.user;
    if (!u.isSuperAdmin && u.userType !== UserType.SUPER_ADMIN) {
      const companyMismatch = record.company_id != null && record.company_id !== u.companyId;
      const branchMismatch  = record.branch_id  != null && record.branch_id  !== u.branchId;
      if (companyMismatch || branchMismatch) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    await repo.remove(record);

    await notifyAffectedUsers(record);

    return res.json({
      success: true,
      message: "Deleted successfully"
    });
  }


  @Put("/:id/approve")
@Middleware([authenticateMiddleware,approveGuard()])
public async approve(req:any,res:any){

const repo = dataSource.getRepository(RolePermission);

const record = await repo.findOne({

where:{id:Number(req.params.id)}
});

if(!record){

return res.status(404).json({
success:false,
message:"Role access not found"
});

}

const status = req.body?.status;

record.status =
Object.values(StatusType).includes(status)
? status
: StatusType.ACTIVE;

await repo.save(record);

await notifyAffectedUsers(record);

return res.json({
success:true,
message:"Role access approved successfully",
data:record
});

}

  // =====================================================
  // BATCH ASSIGN / UPDATE / REVOKE ROLE ACCESS
  // =====================================================
  @Post("/batch")
  @Middleware([authenticateMiddleware])
  async batch(req: any, res: any) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const body = req.body;
      const u = req.user;

      let grants: any[] = [];
      let revokes: any[] = [];
      let scope: { company_id: number | null; branch_id: number | null; user_id: number | null } | string = { company_id: null, branch_id: null, user_id: null };
      let role_id: number | null = null;

      if (Array.isArray(body)) {
        grants = body;
      } else {
        grants = Array.isArray(body.grants) ? body.grants : (Array.isArray(body.add) ? body.add : (Array.isArray(body.permissions) ? body.permissions : []));
        revokes = Array.isArray(body.revokes) ? body.revokes : (Array.isArray(body.delete) ? body.delete : (Array.isArray(body.remove) ? body.remove : []));
        role_id = body.role_id ? Number(body.role_id) : null;
        scope = parseScope(body);
        if (typeof scope === "string") {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: scope });
        }
      }

      const repo = queryRunner.manager.getRepository(RolePermission);
      const notifyScopes = new Set<string>();
      const createdRecords: RolePermission[] = [];
      const removedIds: number[] = [];

      // 1. Process Revokes / Deletions
      for (const item of revokes) {
        let record: RolePermission | null = null;
        const id = typeof item === "number" ? item : (item && item.id ? Number(item.id) : null);
        const permission_id = typeof item === "object" && item && item.permission_id ? Number(item.permission_id) : null;

        if (id) {
          record = await repo.findOne({ where: { id } });
        } else if (permission_id && role_id != null && typeof scope !== "string") {
          record = await repo.findOne({
            where: { role_id, permission_id, ...scopeWhere(scope) }
          });
        }

        if (record) {
          if (!u.isSuperAdmin && u.userType !== UserType.SUPER_ADMIN) {
            const companyMismatch = record.company_id != null && record.company_id !== u.companyId;
            const branchMismatch  = record.branch_id  != null && record.branch_id  !== u.branchId;
            if (companyMismatch || branchMismatch) {
              await queryRunner.rollbackTransaction();
              return res.status(403).json({ success: false, message: "Access denied to delete permission ID " + record.id });
            }
          }

          notifyScopes.add(JSON.stringify({
            role_id: record.role_id,
            company_id: record.company_id,
            branch_id: record.branch_id,
            user_id: record.user_id,
          }));

          removedIds.push(record.id);
          await repo.remove(record);
        }
      }

      const dbPermRepo = queryRunner.manager.getRepository(Permission);
      const dbMenuRepo = queryRunner.manager.getRepository(Menu);

      // 2. Process Grants / Additions
      for (const item of grants) {
        const itemRole = item.role_id ? Number(item.role_id) : role_id;
        let itemPermId = item.permission_id ? Number(item.permission_id) : (typeof item === "number" ? item : null);
        
        if (!itemRole) {
          continue;
        }

        // Dynamically resolve real DB permission_id if itemPermId is missing or synthesized
        let targetPerm: Permission | null = null;
        if (itemPermId) {
          targetPerm = await dbPermRepo.findOne({ where: { id: itemPermId } });
        }

        if (!targetPerm && (item.menu_path || item.menu_name || item.menu_id) && item.action) {
          let targetMenu: Menu | null = null;
          if (item.menu_id) {
            targetMenu = await dbMenuRepo.findOne({ where: { id: Number(item.menu_id) } });
          }
          if (!targetMenu && item.menu_path) {
            targetMenu = await dbMenuRepo.findOne({ where: { path: item.menu_path } });
          }
          if (!targetMenu && item.menu_name) {
            targetMenu = await dbMenuRepo.findOne({ where: { name: item.menu_name } });
          }

          if (targetMenu) {
            targetPerm = await dbPermRepo.findOne({
              where: { menu_id: targetMenu.id, action: item.action }
            });

            if (!targetPerm) {
              targetPerm = dbPermRepo.create({
                menu_id: targetMenu.id,
                action: item.action
              });
              targetPerm = await dbPermRepo.save(targetPerm);
            }
          }
        }

        if (targetPerm) {
          itemPermId = targetPerm.id;
        }

        if (!itemPermId) {
          continue;
        }

        const itemScope = item.company_id !== undefined || item.branch_id !== undefined || item.user_id !== undefined
          ? parseScope(item)
          : scope;

        if (typeof itemScope === "string") {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: itemScope });
        }

        if (!u.isSuperAdmin && u.userType !== UserType.SUPER_ADMIN) {
          if (itemScope.company_id != null && itemScope.company_id !== u.companyId) {
            await queryRunner.rollbackTransaction();
            return res.status(403).json({ success: false, message: "Access denied to assign company_id " + itemScope.company_id });
          }
          if (itemScope.branch_id != null && itemScope.branch_id !== u.branchId) {
            await queryRunner.rollbackTransaction();
            return res.status(403).json({ success: false, message: "Access denied to assign branch_id " + itemScope.branch_id });
          }
        }

        const exists = await repo.findOne({
          where: { role_id: itemRole, permission_id: itemPermId, ...scopeWhere(itemScope) }
        });

        if (!exists) {
          const data = repo.create({
            role_id: itemRole,
            permission_id: itemPermId,
            company_id: itemScope.company_id,
            branch_id: itemScope.branch_id,
            user_id: itemScope.user_id,
            canApprove: !!item.canApprove,
            status: StatusType.ACTIVE
          } as Partial<RolePermission>);

          const saved = await repo.save(data);
          createdRecords.push(saved);

          notifyScopes.add(JSON.stringify({
            role_id: saved.role_id,
            company_id: saved.company_id,
            branch_id: saved.branch_id,
            user_id: saved.user_id,
          }));
        } else if (item.canApprove !== undefined && exists.canApprove !== !!item.canApprove) {
          exists.canApprove = !!item.canApprove;
          const updated = await repo.save(exists);
          createdRecords.push(updated);

          notifyScopes.add(JSON.stringify({
            role_id: updated.role_id,
            company_id: updated.company_id,
            branch_id: updated.branch_id,
            user_id: updated.user_id,
          }));
        }
      }

      await queryRunner.commitTransaction();

      for (const scopeStr of notifyScopes) {
        try {
          const sc = JSON.parse(scopeStr);
          await notifyAffectedUsers(sc);
        } catch (e) {
          console.error("Error notifying scope:", e);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Role access updated successfully",
        data: {
          created: createdRecords,
          removedIds
        }
      });
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return res.status(500).json({
        success: false,
        message: error?.message || "Batch update failed"
      });
    } finally {
      await queryRunner.release();
    }
  }
}