import { UserType } from "../utils/Role-Access";

export class TenantService {

  static apply(user: any, qb: any, alias: string) {

    if (user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN) {
      return qb;
    }

    switch (user.userType) {

      case UserType.ADMIN:
        qb.andWhere(`${alias}.company_id = :companyId`, { companyId: user.companyId });
        break;

      case UserType.BRANCH:
      case UserType.BRANCH_MANAGER:
      case UserType.SHOPKEEPER:
        qb.andWhere(`${alias}.company_id = :companyId`, { companyId: user.companyId });
        qb.andWhere(`${alias}.branch_id = :branchId`,   { branchId:  user.branchId  });
        break;

      case UserType.DELIVERY_BOY:
        qb.andWhere(`${alias}.assigned_to = :userId`, { userId: user.userId });
        break;

      case UserType.CUSTOMER:
        qb.andWhere(`${alias}.user_id = :userId`, { userId: user.userId });
        break;

    }

    return qb;
  }

  static scopeWhere(user: any, baseWhere: any = {}): any {

    if (user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN) {
      return baseWhere;
    }

    switch (user.userType) {

      case UserType.ADMIN:
        return { ...baseWhere, company_id: user.companyId };

      case UserType.BRANCH:
      case UserType.BRANCH_MANAGER:
      case UserType.SHOPKEEPER:
        return { ...baseWhere, company_id: user.companyId, branch_id: user.branchId };

      case UserType.DELIVERY_BOY:
        return { ...baseWhere, assigned_to: user.userId };

      case UserType.CUSTOMER:
        return { ...baseWhere, user_id: user.userId };

      default:
        return baseWhere;
    }
  }
}