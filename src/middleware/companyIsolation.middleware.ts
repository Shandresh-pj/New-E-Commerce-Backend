import { Request, Response, NextFunction } from "express";

export const companyIsolation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const user = (req as any).user;

  if (!user?.company_id) {
    return res.status(403).json({
      success: false,
      message: "Company access denied",
    });
  }

  (req as any).company_id = user.company_id;

  next();
};