export class TenantQuery {

  static apply(user: any, where: any = {}) {

    if (user.isSuperAdmin) return where;

    return {
      ...where,
      company_id: user.companyId,
    };
  }

  static applyBranch(user: any, where: any = {}) {

    if (user.isSuperAdmin) return where;

    return {
      ...where,
      company_id: user.companyId,
      branch_id: user.branchId,
    };
  }
}