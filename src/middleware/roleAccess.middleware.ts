import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  RoleAccessService,
} from "../services/role-access.service";

export const roleAccess = (
  module_name: string,
  action:
    | "view"
    | "add"
    | "edit"
    | "delete"
    | "approve"
) => {

  return async (
    req: any,
    res: Response,
    next: NextFunction
  ) => {

    const allowed =
      await RoleAccessService
        .checkPermission(
          req.user.company_id,
          req.user.usertype,
          module_name,
          action
        );

    if (!allowed) {

      return res.status(403)
        .json({
          success: false,
          message:
            "Permission denied",
        });
    }

    next();
  };
};