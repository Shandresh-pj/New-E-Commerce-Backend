import { Response, NextFunction } from "express";
import { UserType } from "../utils/Role-Access";

export const approveGuard = () => {
  return (
    req: any,
    res: Response,
    next: NextFunction
  ) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const allowedRoles = [
      UserType.SUPER_ADMIN,
      UserType.ADMIN
    ];

    if (
      !allowedRoles.includes(
        req.user.userType
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Approval access denied"
      });
    }

    next();
  };
};