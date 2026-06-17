import { Request, Response, NextFunction } from "express";

export const autoPagination = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  (req as any).pagination = {
    page,
    limit,
    skip: (page - 1) * limit,
  };

  next();
};