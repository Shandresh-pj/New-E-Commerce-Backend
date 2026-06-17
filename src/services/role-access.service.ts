import { RolePermission } from "../entities/role-access";
import { dataSource } from "../server";

export class RoleAccessService {

  static getRepo() {
    return dataSource.getRepository(RolePermission);
  }

  // ✅ FIXED METHOD NAME (this is what you were missing)
  static async checkPermission(
    company_id: number,
    role: string,
    module: string,
    action: "view" | "add" | "edit" | "delete" | "approve"
  ) {
    const access = await this.getRepo().findOne({
      // cast where to any to satisfy FindOptionsWhere typing mismatch for 'role'
      where: ({
        company_id,
        role,
        module,
      } as any),
    });

    if (!access) return false;

    switch (action) {
      case "view": return access.can_view;
      case "add": return access.can_add;
      case "edit": return access.can_edit;
      case "delete": return access.can_delete;
      // case "approve": return access.can_approve;
      default: return false;
    }
  }
}