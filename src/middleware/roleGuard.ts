import { UserType } from "../utils/Role-Access";


export const roleGuard = (roles: UserType[]) => {
  return (req: any, res: any, next: any) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isSuperAdmin = !!(
      req.user.isSuperAdmin ||
      req.user.userType === UserType.SUPER_ADMIN ||
      req.user.user_type === UserType.SUPER_ADMIN
    );

    if (isSuperAdmin) {
      return next();
    }

    const userType = req.user.userType || req.user.user_type;
    if (!roles.includes(userType)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};