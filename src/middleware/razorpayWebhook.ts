import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiError } from "../exceptions/ApiError";

export const verifyRazorpayWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return next(new ApiError(401, "Missing Razorpay Signature or Webhook Secret"));
  }

  // We need the raw body to verify the signature accurately.
  // Assuming raw-body is already attached to req.rawBody or we stringify req.body
  // For Express, usually you need a custom body parser for webhooks to keep the raw buffer.
  const payload = (req as any).rawBody ? (req as any).rawBody : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== signature) {
    return next(new ApiError(401, "Invalid Razorpay Webhook Signature"));
  }

  next();
};
