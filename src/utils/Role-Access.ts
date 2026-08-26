export enum UserType {
  SUPER_ADMIN    = "Super_Admin",
  ADMIN          = "Admin",
  BRANCH         = "Branch",
  EMPLOYEE       = "Employee",
  BRANCH_MANAGER = "Branch_Manager",
  SHOPKEEPER     = "Shopkeeper",
  DELIVERY_BOY   = "Delivery_Boy",
  CUSTOMER       = "Customer",
  // ── Healthcare ERP roles ──────────────────────────────────────────────
  HOSPITAL_ADMIN = "Hospital_Admin",
  DOCTOR         = "Doctor",
  PHARMACIST     = "Pharmacist",
  RECEPTIONIST   = "Receptionist",
}

export enum StatusType {
  ACTIVE    = "Active",
  INACTIVE  = "Inactive",
  SUSPENDED = "Suspended",
  PENDING   = "Pending",
}

// Used only for the employees table `type` column — distinct from UserType
export enum EmployeeType {
  BRANCH_MANAGER = "BRANCH MANAGER",
  SHOPKEEPER     = "SHOPKEEPER",
  DELIVERY_BOY   = "DELIVERY BOY",
}

export const ROLE_PERMISSIONS: Record<UserType, {
  canCreate:  boolean;
  canRead:    boolean;
  canUpdate:  boolean;
  canDelete:  boolean;
  canApprove: boolean;
}> = {
  [UserType.SUPER_ADMIN]:    { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: true  },
  [UserType.ADMIN]:          { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: true  },
  [UserType.BRANCH]:         { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: false },
  [UserType.EMPLOYEE]:       { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: false, canApprove: false },
  [UserType.BRANCH_MANAGER]: { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: false },
  [UserType.SHOPKEEPER]:     { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: false, canApprove: false },
  [UserType.DELIVERY_BOY]:   { canCreate: false, canRead: true,  canUpdate: true,  canDelete: false, canApprove: false },
  [UserType.CUSTOMER]:       { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: false },
  // ── Healthcare roles ──────────────────────────────────────────────────
  [UserType.HOSPITAL_ADMIN]: { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: true  },
  [UserType.DOCTOR]:         { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: false, canApprove: false },
  [UserType.PHARMACIST]:     { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: false, canApprove: true  },
  [UserType.RECEPTIONIST]:   { canCreate: true,  canRead: true,  canUpdate: false, canDelete: false, canApprove: false },
};
