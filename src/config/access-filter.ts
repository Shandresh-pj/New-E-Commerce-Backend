import { UserType } from "../utils/Role-Access";

export function applyTenantFilter(req: any, qb: any, alias: string) {

  const user = req.user;

  // 👑 SUPER ADMIN
  if (user.isSuperAdmin) return qb;

  // 🏢 ADMIN (company level)
  if (user.userType === UserType?.ADMIN) {
    qb.andWhere(`${alias}.company_id = :companyId`, {
      companyId: user.companyId
    });
  }

  // 🏬 BRANCH
  if (user.userType === UserType?.BRANCH) {
    qb.andWhere(`${alias}.branch_id = :branchId`, {
      branchId: user.branchId
    });
  }

  // 👷 EMPLOYEE
  if (user.userType === UserType?.EMPLOYEE) {
    qb.andWhere(`${alias}.company_id = :companyId`, {
      companyId: user.companyId
    });
    qb.andWhere(`${alias}.branch_id = :branchId`, {
      branchId: user.branchId
    });
  }

  // 👤 CUSTOMER
  if (user.userType === UserType?.CUSTOMER) {
    qb.andWhere(`${alias}.user_id = :userId`, {
      userId: user.userId
    });
  }

  return qb;
}