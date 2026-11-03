// middleware/branchIsolation.ts
// SECURITY: branchId is read from req.user which is set exclusively by
// authenticate.middleware.ts after verifying the JWT signature. It cannot
// be overridden by query params or request body.
import { Response, NextFunction } from "express";

export const branchIsolation = (
  req: any,
  res: Response,
  next: NextFunction
): void => {

  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  // Super-admin bypasses branch scope.
  if (req.user.isSuperAdmin === true) {
    return next();
  }

  const branchId = req.user.branchId || req.user.branch_id;

  // Validate branchId is a positive integer.
  if (!branchId || !Number.isInteger(Number(branchId)) || Number(branchId) < 1) {
    res.status(403).json({ success: false, message: "Branch access denied" });
    return;
  }

  req.branchId = Number(branchId);
  next();
};
