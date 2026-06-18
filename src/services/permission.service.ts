import { PermissionType } from "../entities/menu";
import { RolePermission } from "../entities/role-access";
import { UserRole } from "../entities/user";
import { dataSource } from "../server";
export class PermissionService {

  static async hasPermission(
    userId: number,
    menuName: string,
    action: PermissionType
  ): Promise<boolean> {

    const userRoles =
      await dataSource
        .getRepository(UserRole)
        .find({
          where: {
            user_id: userId
          }
        });

    if (!userRoles.length) {
      return false;
    }

    const roleIds =
      userRoles.map(
        role => role.role_id
      );

    const rolePermissions =
      await dataSource
        .getRepository(RolePermission)
        .createQueryBuilder("rp")
        .leftJoinAndSelect(
          "rp.permission",
          "permission"
        )
        .leftJoinAndSelect(
          "permission.menu",
          "menu"
        )
        .where(
          "rp.roleId IN (:...roleIds)",
          { roleIds }
        )
        .getMany();

    return rolePermissions.some(
      permission =>
        permission.permission.menu === menuName &&
        permission.permission.action === action
    );
  }
}