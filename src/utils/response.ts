import { Response } from "express";

export const success = (
  res: Response,
  data: any = null,
  message = "Success",
  status = 200
): Response => {
  return res.status(status).json({ success: true, message, data });
};

export const error = (
  res: Response,
  message = "Error",
  status = 500
): Response => {
  return res.status(status).json({ success: false, message });
};

export default { success, error };

// Keep CommonJS compatibility
module.exports = {
  success,
  error,
};