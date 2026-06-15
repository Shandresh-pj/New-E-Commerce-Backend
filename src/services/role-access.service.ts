import { RoleAccess } from "../entities/role-access";
import { dataSource } from "../server";

export class RoleAccessService {

  static async checkPermission(
    company_id: number,
    role_name: string,
    module_name: string,
    action:
      | "view"
      | "add"
      | "edit"
      | "delete"
      | "approve"
  ) {

    const access =
      await dataSource
        .getRepository(RoleAccess)
        .findOne({
          where: {
            company_id,
            role_name,
            module_name,
          },
        });

    if (!access) {
      return false;
    }

    switch (action) {

      case "view":
        return access.can_view;

      case "add":
        return access.can_add;

      case "edit":
        return access.can_edit;

      case "delete":
        return access.can_delete;

      case "approve":
        return access.can_approve;

      default:
        return false;
    }
  }
}