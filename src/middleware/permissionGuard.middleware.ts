
import { PermissionType } from "../entities/menu";
import { PermissionService } from "../services/permission.service";

export const dynamicPermissionGuard =
(menu: string) => {

  return async (
    req: any,
    res: any,
    next: any
  ) => {

    try {

      const action =
        req.body.action as PermissionType;

      if (!action) {

        return res.status(400).json({
          success: false,
          message: "Action is required"
        });

      }

      const allowed =
        await PermissionService.hasPermission(
          req.user.userId,
          menu,
          action
        );

      if (!allowed) {

        return res.status(403).json({
          success: false,
          message: `No ${action} permission`
        });

      }

      next();

    } catch (error) {

      return res.status(500).json({
        success: false,
        message: "Permission validation failed"
      });

    }
  };
};