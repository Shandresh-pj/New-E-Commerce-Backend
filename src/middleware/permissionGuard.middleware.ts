import { PermissionService } from "../services/permission.service";

export const permissionGuard = (menu: string, action: string) => {
  return async (req: any, res: any, next: any) => {

    if (req.user.isSuperAdmin) return next();

    const allowed = await PermissionService.hasPermission(
      req.user.userId,
      menu,
      action
    );

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};