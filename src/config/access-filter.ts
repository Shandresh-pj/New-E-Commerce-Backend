import { UserType } from "../utils/Role-Access";

export function applyAccess(req: any, qb: any, alias: string) {

  const user = req.user;

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