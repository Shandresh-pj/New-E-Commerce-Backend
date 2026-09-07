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
  return async (req: any, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized access: login required"
      });
    }

    // ── 1. Super Admin Rule: Highest-privilege role, full unconstrained access ──
    const isSuperAdmin = !!(
      req.user.isSuperAdmin ||
      req.user.userType === UserType.SUPER_ADMIN ||
      req.user.user_type === UserType.SUPER_ADMIN ||
      req.user.role === "super_admin"
    );

    if (isSuperAdmin) {
      req.companyId = req.user.companyId || req.user.company_id || 1;
      req.branchId  = req.user.branchId  || req.user.branch_id  || 1;
      return next();
    }

    const userType = req.user.userType || req.user.user_type;

    // ── 2. Explicit Deny Check (e.g. denyDelete) ───────────────────────────
    if (opts.denyDelete && opts.denyDelete.length > 0) {
      if (req.method === "DELETE" && opts.denyDelete.includes(userType)) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Access denied: delete operation not permitted for your role"
        });
      }
    }

    // ── 3. Approval Requirement Check ──────────────────────────────────────
    if (opts.requireApproval) {
      const rolePerms = ROLE_PERMISSIONS[userType as UserType];
      let hasApprovalPermission = rolePerms?.canApprove === true;

      if (!hasApprovalPermission) {
        try {
          const { PermissionService } = require("../services/permission.service");
          hasApprovalPermission = await PermissionService.hasPermission(req.user.id, opts.menu || "", "APPROVE");
        } catch (err) {
          console.error("[Authorize middleware] Approval permission check error:", err);
        }
      }

      if (!hasApprovalPermission) {
        const permissions: any[] = req.user.permissions || [];
        hasApprovalPermission = permissions.some((p: any) => p === "FULL_ACCESS" || p.canApprove === true || p.action === "APPROVE");
      }

      if (!hasApprovalPermission) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Approval access denied: approval privileges required"
        });
      }
    }

    // ── 4. Role & Dynamic RBAC Permission Evaluation ────────────────────────
    const hasRoleList = Array.isArray(opts.roles) && opts.roles.length > 0;
    const isRoleMatched = hasRoleList ? opts.roles!.includes(userType) : false;

    // If a roles list is specified and the user's role is in the list, access is granted.
    // If the role is NOT in the list, check if dynamic DB/JWT permission can grant an override.
    if (hasRoleList && !isRoleMatched) {
      let hasOverride = false;
      const targetMenu = opts.menu;
      const targetAction = opts.action || (req.method === "POST" ? "CREATE" : req.method === "PUT" || req.method === "PATCH" ? "UPDATE" : req.method === "DELETE" ? "DELETE" : "READ");

      if (targetMenu) {
        try {
          const { PermissionService } = require("../services/permission.service");
          hasOverride = await PermissionService.hasPermission(req.user.id, targetMenu, targetAction);
        } catch (err) {
          console.error("[Authorize middleware] Permission evaluation error:", err);
        }

        if (!hasOverride) {
          const permissions: any[] = req.user.permissions || [];
          hasOverride = permissions.some((p: any) => {
            if (p === "FULL_ACCESS") return true;
            const menuName = (p.menu?.name || p.menu_name || "").toLowerCase();
            const menuPath = (p.menu?.path || p.menu_path || "").toLowerCase();
            const target = (targetMenu || "").toLowerCase();
            const isMenuMatch = menuName === target || menuPath === target || target.includes(menuName);
            return isMenuMatch && (p.action === targetAction || p.canApprove === true);
          });
        }
      }

      if (!hasOverride) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Access denied: insufficient role privileges"
        });
      }
    } else if (!hasRoleList && (opts.menu || opts.action)) {
      // No roles list specified, but explicit menu/action permission is required
      const targetMenu = opts.menu || (req.baseUrl || req.originalUrl || req.path || "").replace(/^\/api/, "").split("?")[0];
      const targetAction = opts.action || (req.method === "POST" ? "CREATE" : req.method === "PUT" || req.method === "PATCH" ? "UPDATE" : req.method === "DELETE" ? "DELETE" : "READ");

      let hasDbPermission = false;
      try {
        const { PermissionService } = require("../services/permission.service");
        hasDbPermission = await PermissionService.hasPermission(req.user.id, targetMenu, targetAction);
      } catch (err) {
        console.error("[Authorize middleware] Permission evaluation error:", err);
      }

      if (!hasDbPermission) {
        const permissions: any[] = req.user.permissions || [];
        const hasJwtPermission = permissions.some((p: any) => {
          if (p === "FULL_ACCESS") return true;
          const menuName = (p.menu?.name || p.menu_name || "").toLowerCase();
          const menuPath = (p.menu?.path || p.menu_path || "").toLowerCase();
          const target = (targetMenu || "").toLowerCase();
          const isMenuMatch = menuName === target || menuPath === target || target.includes(menuName);
          return isMenuMatch && (p.action === targetAction || p.canApprove === true);
        });

        if (!hasJwtPermission) {
          return res.status(403).json({
            success: false,
            statusCode: 403,
            message: `Permission denied: ${targetAction} action on ${targetMenu} module is not authorized`
          });
        }
      }
    }

    // ── 5. Tenant Scoping for Authorized Non-Super-Admin Users ──────────────
    const effectiveCompanyId = req.user.companyId || req.user.company_id;
    const effectiveBranchId  = req.user.branchId  || req.user.branch_id;

    const branchScopedRoles = [
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.DELIVERY_BOY,
    ];

    if (userType !== UserType.CUSTOMER) {
      req.companyId = effectiveCompanyId ? Number(effectiveCompanyId) : 1;
    }

    if (branchScopedRoles.includes(userType)) {
      req.branchId = effectiveBranchId ? Number(effectiveBranchId) : 1;
    } else if (effectiveBranchId) {
      req.branchId = Number(effectiveBranchId);
    }

    next();
  };
}
