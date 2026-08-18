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

    // ── 2. Determine target menu & action ──────────────────────────────────
    let targetMenu = opts.menu;
    if (!targetMenu) {
      // Infer menu path from request URL/route (e.g. /api/leave → /leave)
      const rawPath = req.baseUrl || req.originalUrl || req.path || "";
      targetMenu = rawPath.replace(/^\/api/, "").split("?")[0];
    }

    let targetAction = opts.action;
    if (!targetAction) {
      if (opts.requireApproval) {
        targetAction = "APPROVE";
      } else {
        const method = (req.method || "GET").toUpperCase();
        switch (method) {
          case "GET":     targetAction = "READ"; break;
          case "POST":    targetAction = "CREATE"; break;
          case "PUT":
          case "PATCH":   targetAction = "UPDATE"; break;
          case "DELETE":  targetAction = "DELETE"; break;
          default:        targetAction = "READ"; break;
        }
      }
    }

    // ── 3. Dynamic Database RBAC Evaluation ─────────────────────────────────
    let hasDbPermission = false;
    try {
      const { PermissionService } = require("../services/permission.service");
      hasDbPermission = await PermissionService.hasPermission(req.user.id, targetMenu, targetAction);
    } catch (err) {
      console.error("[Authorize middleware] Permission evaluation error:", err);
    }

    // ── 4. Strict Least-Privilege Enforcement for Non-Super-Admin Roles ────
    // Role privilege restriction check (if specific roles are restricted for this route)
    if (opts.roles && opts.roles.length > 0) {
      const userType = req.user.userType || req.user.user_type;
      if (!opts.roles.includes(userType) && !hasDbPermission) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Access denied: insufficient role privileges"
        });
      }
    }

    // Explicit deny delete check
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

    // Require dynamic permission grant if not matched by role or explicit permission
    if (!hasDbPermission) {
      // Check if user has explicit JWT permission array as fallback
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

    // ── 5. Tenant Scoping for Authorized Non-Super-Admin Users ──────────────
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
