import { Request, Response, NextFunction } from "express";

export function tenantMiddleware(req: any, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.tenant = {
    userId: req.user.id,
    companyId: req.user.company_id,
    branchId: req.user.branch_id,
    role: req.user.role,
    isSuperAdmin: req.user.isSuperAdmin,
  };

  next();
}