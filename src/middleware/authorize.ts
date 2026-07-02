import { Response, NextFunction } from "express";
import { UserType, ROLE_PERMISSIONS } from "../utils/Role-Access";

interface AuthorizeOptions {
  roles?: UserType[];
  menu?: string;
  action?: string;
  denyDelete?: UserType[];
  requireApproval?: boolean;
}

export function authorize(opts: AuthorizeOptions = {}) {
  return (req: any, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.isSuperAdmin) return next();

    if (opts.roles && opts.roles.length > 0) {
      if (!opts.roles.includes(req.user.userType)) {
        return res.status(403).json({ success: false, message: "Access denied: insufficient role" });
      }
    }

    if (opts.denyDelete && opts.denyDelete.length > 0) {
      if (req.method === "DELETE" && opts.denyDelete.includes(req.user.userType)) {
        return res.status(403).json({ success: false, message: "Access denied: delete not permitted for your role" });
      }
    }

    if (opts.menu && opts.action) {
      const permissions: any[] = req.user.permissions || [];
      const allowed = permissions.some(
        (p: any) => p.menu?.name === opts.menu && p.action === opts.action
      );
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }
    }

    if (opts.requireApproval) {
      const perms = ROLE_PERMISSIONS[req.user.userType as UserType];
      if (!perms?.canApprove) {
        const dbPermissions: any[] = req.user.permissions || [];
        const hasDbApproval = dbPermissions.some(
          (p: any) => p.action === "APPROVE"
        );
        if (!hasDbApproval) {
          return res.status(403).json({ success: false, message: "Approval access denied" });
        }
      }
    }

    const branchScopedRoles = [
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.DELIVERY_BOY,
    ];

    if (req.user.userType !== UserType.CUSTOMER) {
      if (!req.user.companyId) {
        return res.status(403).json({ success: false, message: "Company access denied" });
      }
      req.companyId = req.user.companyId;
    }

    if (branchScopedRoles.includes(req.user.userType) && !req.user.branchId) {
      return res.status(403).json({ success: false, message: "Branch access denied" });
    }
    if (req.user.branchId) {
      req.branchId = req.user.branchId;
    }

    next();
  };
}
