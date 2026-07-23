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
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized access: login required"
      });
    }

    const isSuperAdmin = !!(
      req.user.isSuperAdmin ||
      req.user.userType === UserType.SUPER_ADMIN ||
      req.user.user_type === UserType.SUPER_ADMIN
    );

    if (isSuperAdmin) {
      req.companyId = req.user.companyId || req.user.company_id || 1;
      req.branchId  = req.user.branchId  || req.user.branch_id  || 1;
      return next();
    }

    if (opts.roles && opts.roles.length > 0) {
      const userType = req.user.userType || req.user.user_type;
      if (!opts.roles.includes(userType)) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Access denied: insufficient role privileges"
        });
      }
    }

    if (opts.denyDelete && opts.denyDelete.length > 0) {
      const userType = req.user.userType || req.user.user_type;
      if (req.method === "DELETE" && opts.denyDelete.includes(userType)) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Access denied: delete operation not permitted for your role"
        });
      }
    }

    if (opts.menu && opts.action) {
      const permissions: any[] = req.user.permissions || [];
      if (permissions.length > 0 && !permissions.includes("FULL_ACCESS")) {
        const allowed = permissions.some((p: any) => {
          const menuName = (p.menu?.name || p.menu_name || '').toLowerCase();
          const menuPath = (p.menu?.path || p.menu_path || '').toLowerCase();
          const target = (opts.menu || '').toLowerCase();
          const isMenuMatch = menuName === target || menuPath === target || target.includes(menuName);
          return isMenuMatch && p.action === opts.action;
        });

        if (!allowed) {
          return res.status(403).json({
            success: false,
            statusCode: 403,
            message: `Permission denied: ${opts.action} action on ${opts.menu} module is not authorized`
          });
        }
      }
    }

    if (opts.requireApproval) {
      const userType = req.user.userType || req.user.user_type;
      const perms = ROLE_PERMISSIONS[userType as UserType];
      if (!perms?.canApprove) {
        const dbPermissions: any[] = req.user.permissions || [];
        const hasDbApproval = dbPermissions.some((p: any) => p.action === "APPROVE" || p.canApprove === true);
        if (!hasDbApproval) {
          return res.status(403).json({
            success: false,
            statusCode: 403,
            message: "Approval access denied: approval privileges required"
          });
        }
      }
    }

    const effectiveCompanyId = req.user.companyId || req.user.company_id;
    const effectiveBranchId  = req.user.branchId  || req.user.branch_id;
    const userType = req.user.userType || req.user.user_type;

    const branchScopedRoles = [
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.DELIVERY_BOY,
    ];

    if (userType !== UserType.CUSTOMER) {
      if (!effectiveCompanyId) {
        req.companyId = 1;
      } else {
        req.companyId = Number(effectiveCompanyId);
      }
    }

    if (branchScopedRoles.includes(userType)) {
      if (!effectiveBranchId) {
        req.branchId = 1;
      } else {
        req.branchId = Number(effectiveBranchId);
      }
    } else if (effectiveBranchId) {
      req.branchId = Number(effectiveBranchId);
    }

    next();
  };
}
