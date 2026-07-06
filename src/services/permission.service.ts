import { IsNull, In } from "typeorm";
import { RolePermission } from "../entities/role-access";
import { User, UserRole } from "../entities/user";
import { StatusType } from "../utils/Role-Access";
import { dataSource } from "../server";

export class PermissionService {

  static async hasPermission(userId: number, menu: string, action: string) {

    const roles = await dataSource.getRepository(UserRole).find({
      where: { user_id: userId }
    });

    if (!roles.length) return false;

    const roleIds = roles.map(r => r.role_id);

    const permissions = await dataSource
      .getRepository(RolePermission)
      .createQueryBuilder("rp")
      .leftJoinAndSelect("rp.permission", "permission")
      .leftJoinAndSelect("permission.menu", "menu")
      .where("rp.role_id IN (:...roleIds)", { roleIds })
      .getMany();

    return permissions.some(
  p =>
    p.permission?.menu?.name === menu &&
    p.permission?.action === action
);
  }

  // Scope-aware permission/menu resolution (global < admin < branch < employee,
  // most specific wins). Mirrors the login-time resolution exactly so both call
  // sites (login token issuance and the live "my access" refresh) stay in sync.
  static async resolveAccess(user: User, userRoles: UserRole[]): Promise<{ permissions: any[]; menus: any[] }> {

    if (user.isSuperAdmin) {
      return { permissions: ["FULL_ACCESS"], menus: ["ALL"] };
    }

    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    const scopeConditions: any[] = [];

    for (const ur of userRoles) {
      const roleId = ur.role.id;
      const companyId = ur.company?.id ?? ur.company_id ?? null;
      const branchId = ur.branch?.id ?? ur.branch_id ?? null;

      scopeConditions.push({ role_id: roleId, company_id: IsNull(), branch_id: IsNull(), user_id: IsNull() });

      if (companyId) {
        scopeConditions.push({ role_id: roleId, company_id: companyId, branch_id: IsNull(), user_id: IsNull() });

        if (branchId) {
          scopeConditions.push({ role_id: roleId, company_id: companyId, branch_id: branchId, user_id: IsNull() });
        }
      }
    }

    // employee-level rows aimed at this user, whatever the role
    scopeConditions.push({ user_id: user.id });

    // Pending stays usable so rows created before the approve flow keep
    // working; Inactive/Suspended are shut off.
    const usableStatus = In([StatusType.ACTIVE, StatusType.PENDING]);

    const matched = await rolePermissionRepo.find({
      where: scopeConditions.map(c => ({ ...c, status: usableStatus })),
      relations: { permission: { menu: true } },
    });

    // Most specific scope wins per permission: employee > branch > admin > global
    const specificity = (rp: any) =>
      rp.user_id ? 4 : rp.branch_id ? 3 : rp.company_id ? 2 : 1;

    const byPermission = new Map<number, any>();

    for (const rp of matched) {
      const existing = byPermission.get(rp.permission_id);
      if (!existing || specificity(rp) > specificity(existing)) {
        byPermission.set(rp.permission_id, rp);
      }
    }

    const rolePermissions = Array.from(byPermission.values());

    const permissions = rolePermissions.map((rp: any) => ({
      id: rp.permission.id,
      action: rp.permission.action,
      canApprove: rp.canApprove,
      menu: {
        id: rp.permission.menu.id,
        name: rp.permission.menu.name,
        path: rp.permission.menu.path,
      },
    }));

    let menus = rolePermissions.map((rp: any) => ({
      id: rp.permission.menu.id,
      name: rp.permission.menu.name,
      path: rp.permission.menu.path,
    }));

    // remove duplicate menus
    menus = menus.filter((menu, index, self) => index === self.findIndex(m => m.id === menu.id));

    return { permissions, menus };
  }

  // Fresh roles/permissions/menus for a user, straight from the DB — used by
  // GET /auth/me/permissions and whenever role-access rows change, so a
  // client can refresh its access without needing a new login token.
  static async getUserAccess(userId: number) {

    const userRepo = dataSource.getRepository(User);
    const userRoleRepo = dataSource.getRepository(UserRole);

    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    const userRoles = await userRoleRepo.find({
      where: { user: { id: userId } },
      relations: { role: true, company: true, branch: true },
    });

    const { permissions, menus } = await this.resolveAccess(user, userRoles);

    const roles = userRoles.map(r => ({
      roleId: r.role.id,
      role: r.role.name,
      company: r.company,
      branch: r.branch,
    }));

    return { roles, permissions, menus };
  }
}