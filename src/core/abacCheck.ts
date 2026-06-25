export function abacCheck(user: any, resource: any, action: string) {

  if (user.isSuperAdmin) return true;

  if (resource.company_id !== user.companyId) {
    return false;
  }

  if (user.role === "EMPLOYEE" && action === "delete") {
    return false;
  }

  return true;
}