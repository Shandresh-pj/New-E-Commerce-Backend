import { Response, NextFunction } from "express";
import { UserType, ROLE_PERMISSIONS } from "../utils/Role-Access";

export const approveGuard = () => {
  return (req: any, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const perms = ROLE_PERMISSIONS[req.user.userType as UserType];

    if (!perms?.canApprove) {
      return res.status(403).json({ success: false, message: "Approval access denied" });
    }

    next();
  };
};