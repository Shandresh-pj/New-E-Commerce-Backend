import { RolePermission } from "../entities/role-access";
import { UserRole } from "../entities/user";
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
}