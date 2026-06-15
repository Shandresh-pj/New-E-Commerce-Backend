import {
  Request,
  Response,
  NextFunction
} from "express";

export interface TimezoneRequest
  extends Request {

  clientTimezone?: string;
}

export const timezoneMiddleware = (
  req: TimezoneRequest,
  res: Response,
  next: NextFunction
): void => {

  req.clientTimezone =
    (req.headers["client-timezone"] as string) ||
    "Asia/Kolkata";

  next();
};

export default timezoneMiddleware;