export enum UserType {
  SUPER_ADMIN    = "Super_Admin",
  ADMIN          = "Admin",
  BRANCH_MANAGER = "Branch_Manager",
  STAFF_KEEPER   = "Staff_Keeper",
  DELIVERY_BOY   = "Delivery_Boy",
  CUSTOMER       = "Customer"
}

export enum StatusType {
  ACTIVE    = "Active",
  INACTIVE  = "Inactive",
  SUSPENDED = "Suspended",
  PENDING   = "Pending",
}

// Used only for the employees table `type` column — distinct from UserType
export enum EmployeeType {
  STAFF_KEEPER   = "STAFF KEEPER",
  DELIVERY_BOY   = "DELIVERY BOY",
  BRANCH_MANAGER = "BRANCH MANAGER",
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
  [UserType.BRANCH_MANAGER]: { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: true,  canApprove: false },
  [UserType.STAFF_KEEPER]:   { canCreate: true,  canRead: true,  canUpdate: true,  canDelete: false, canApprove: false },
  [UserType.DELIVERY_BOY]:   { canCreate: false, canRead: true,  canUpdate: false, canDelete: false, canApprove: false },
  [UserType.CUSTOMER]:       { canCreate: false, canRead: true,  canUpdate: false, canDelete: false, canApprove: false },
};
