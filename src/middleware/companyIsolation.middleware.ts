// middleware/companyIsolation.ts
// SECURITY: companyId is read from req.user which is set exclusively by
// authenticate.middleware.ts after verifying the JWT signature. It cannot
// be overridden by query params or request body.
import { Request, Response, NextFunction } from "express";

export const companyIsolation = (
  req: any,
  res: Response,
  next: NextFunction
): void => {

  // If req.user is missing, the authenticate middleware wasn't applied — block immediately.
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  // Super-admin bypasses company scope (they manage all companies).
  // isSuperAdmin is from the server-signed JWT, not client-controlled.
  if (req.user.isSuperAdmin === true) {
    return next();
  }

  const companyId = req.user.companyId || req.user.company_id;

  // Validate companyId is a positive integer — prevents type coercion attacks.
  if (!companyId || !Number.isInteger(Number(companyId)) || Number(companyId) < 1) {
    res.status(403).json({ success: false, message: "Company access denied" });
    return;
  }

  // Bind to req so downstream controllers use this scope.
  req.companyId = Number(companyId);
  next();
};
