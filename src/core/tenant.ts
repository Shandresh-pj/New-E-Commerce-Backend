export type TenantContext = {
  userId: number;
  companyId: number | null;
  branchId?: number | null;
  role: string;
  isSuperAdmin: boolean;
};