import { UserType } from "../utils/Role-Access";

export class TenantService {

  static apply(user: any, qb: any, alias: string) {
    if (!user) return qb;

    if (user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN) {
      return qb;
    }

    switch (user.userType) {
      case UserType.ADMIN:
        qb.andWhere(`${alias}.company_id = :companyId`, { companyId: user.companyId || user.company_id });
        break;

      case UserType.BRANCH:
      case UserType.BRANCH_MANAGER:
      case UserType.SHOPKEEPER:
      case UserType.EMPLOYEE:
        if (user.companyId || user.company_id) {
          qb.andWhere(`${alias}.company_id = :companyId`, { companyId: user.companyId || user.company_id });
        }
        if (user.branchId || user.branch_id) {
          qb.andWhere(`${alias}.branch_id = :branchId`, { branchId: user.branchId || user.branch_id });
        }
        break;

      case UserType.DELIVERY_BOY:
        qb.andWhere(`${alias}.assigned_to = :userId`, { userId: user.userId || user.id });
        break;

      case UserType.CUSTOMER:
        qb.andWhere(`${alias}.user_id = :userId`, { userId: user.userId || user.id });
        break;
    }

    return qb;
  }

  static scopeWhere(user: any, baseWhere: any = {}): any {
    if (!user) return baseWhere;

    if (user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN) {
      return baseWhere;
    }

    const companyId = user.companyId || user.company_id;
    const branchId  = user.branchId || user.branch_id;
    const userId    = user.userId || user.id;

    switch (user.userType) {
      case UserType.ADMIN:
        return companyId ? { ...baseWhere, company_id: companyId } : baseWhere;

      case UserType.BRANCH:
      case UserType.BRANCH_MANAGER:
      case UserType.SHOPKEEPER:
      case UserType.EMPLOYEE:
        const where: any = { ...baseWhere };
        if (companyId) where.company_id = companyId;
        if (branchId) where.branch_id = branchId;
        return where;

      case UserType.DELIVERY_BOY:
        return userId ? { ...baseWhere, assigned_to: userId } : baseWhere;

      case UserType.CUSTOMER:
        return userId ? { ...baseWhere, user_id: userId } : baseWhere;

      default:
        return baseWhere;
    }
  }
}