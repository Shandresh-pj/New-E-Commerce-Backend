import { UserType } from "../utils/Role-Access";


export const roleGuard = (roles: UserType[]) => {
  return (req: any, res: any, next: any) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};