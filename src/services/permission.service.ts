import { IsNull, In } from "typeorm";
import { RolePermission } from "../entities/role-access";
import { User, UserRole } from "../entities/user";
import { StatusType } from "../utils/Role-Access";
import dataSource from "../config/database";
import logger from "../utils/logger";


export class PermissionService {

  static async hasPermission(userId: number, menu: string, action: string): Promise<boolean> {
    try {
      const userRepo = dataSource.getRepository(User);
      const userRoleRepo = dataSource.getRepository(UserRole);

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) return false;

      // Super Admin receives unconstrained access across all menus & actions
      if (user.isSuperAdmin) return true;

      const userRoles = await userRoleRepo.find({
        where: { user_id: userId },
        relations: { role: true, company: true, branch: true },
      });

      if (!userRoles.length) return false;

      const { permissions } = await this.resolveAccess(user, userRoles);

      if (permissions.includes("FULL_ACCESS")) return true;

      const reqActionUpper = (action || "").toUpperCase();
      const reqMenuLower = (menu || "").toLowerCase().replace(/\/+$/, "");

      return permissions.some((p: any) => {
        if (!p || typeof p !== "object") return false;

        const menuPath = (p.menu?.path || p.menu_path || "").toLowerCase().replace(/\/+$/, "");
        const menuName = (p.menu?.name || p.menu_name || "").toLowerCase();

        const pathMatch = menuPath && (reqMenuLower === menuPath || reqMenuLower.startsWith(menuPath + "/"));
        const nameMatch = menuName && (reqMenuLower === menuName || reqMenuLower.startsWith(menuName + "/"));

        if (!pathMatch && !nameMatch) return false;

        const actUpper = (p.action || "").toUpperCase();
        if (actUpper === "ALL" || actUpper === "*" || actUpper === "FULL") return true;
        if (actUpper === reqActionUpper) return true;

        if ((reqActionUpper === "WRITE" || reqActionUpper === "CREATE") &&
            (actUpper === "WRITE" || actUpper === "CREATE")) return true;

        if (reqActionUpper === "APPROVE" && (p.canApprove === true || actUpper === "APPROVE")) return true;

        return false;
      });
    } catch (err) {
      logger.error("[PermissionService.hasPermission error]:", err);
      return false;
    }
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

    logger.debug("[PermissionService] Querying role permissions with scope conditions:", scopeConditions);
    const matched = await rolePermissionRepo.find({
      where: scopeConditions.map(c => ({ ...c, status: usableStatus })),
      relations: { permission: { menu: true } },
    });
    logger.debug("[PermissionService] Role permissions fetched count:", matched.length);

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
        icon: rp.permission.menu.icon,
      },
    }));

    let menus = rolePermissions.map((rp: any) => ({
      id: rp.permission.menu.id,
      name: rp.permission.menu.name,
      path: rp.permission.menu.path,
      icon: rp.permission.menu.icon,
    }));

    // remove duplicate menus
    menus = menus.filter((menu, index, self) => index === self.findIndex(m => m.id === menu.id));

    return { permissions, menus };
  }

  // Fresh roles/permissions/menus for a user, straight from the DB — used by
  // GET /auth/me/permissions and whenever role-access rows change, so a
  // client can refresh its access without needing a new login token.
  static async getUserAccess(userId: number) {
    logger.debug("[PermissionService] getUserAccess called for userId:", userId);
    const userRepo = dataSource.getRepository(User);
    const userRoleRepo = dataSource.getRepository(UserRole);

    logger.debug("[PermissionService] Querying user details...");
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      logger.error("[PermissionService] Error: User not found for id", userId);
      throw new Error("User not found");
    }
    logger.debug("[PermissionService] User found:", user.email, "isSuperAdmin:", user.isSuperAdmin);

    logger.debug("[PermissionService] Querying user roles with relations...");
    const userRoles = await userRoleRepo.find({
      where: { user_id: userId },
      relations: { role: true, company: true, branch: true },
    });
    logger.debug("[PermissionService] User roles fetched. Count:", userRoles.length);

    logger.debug("[PermissionService] Resolving scope-aware access...");
    const { permissions, menus } = await this.resolveAccess(user, userRoles);
    logger.debug("[PermissionService] Access resolved. Permissions:", permissions.length, "Menus:", menus.length);

    const roles = userRoles.map(r => ({
      roleId: r.role.id,
      role: r.role.name,
      company: r.company,
      branch: r.branch,
    }));

    return { roles, permissions, menus };
  }
}