import { Request, Response, NextFunction } from "express";

export interface TimezoneRequest extends Request {
  clientTimezone?: string;
}

export const timezoneMiddleware = (
  req: TimezoneRequest,
  res: Response,
  next: NextFunction
): void => {
  const timezone =
    (req.headers["client-timezone"] as string) ||
    "Asia/Kolkata";

  req.clientTimezone = timezone;

  next();
};

export default timezoneMiddleware;