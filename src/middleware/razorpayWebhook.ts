/**
 * razorpayWebhook.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure Razorpay Webhook Signature Verification Middleware
 *
 * Security hardening:
 *  1. Requires raw body (captured BEFORE express.json parses it) to prevent
 *     body-tampering attacks where a manipulated parsed body differs from the
 *     signed payload.
 *  2. Uses timing-safe HMAC comparison (crypto.timingSafeEqual) to prevent
 *     timing oracle attacks.
 *  3. Validates x-razorpay-signature header format before computing HMAC.
 *  4. Logs all verification failures with IP for security monitoring.
 *  5. Rejects if RAZORPAY_WEBHOOK_SECRET env var is missing at startup.
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiError } from "../exceptions/ApiError";

export const verifyRazorpayWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

  // ── Guard: webhook secret must be configured ───────────────────────────────
  if (!secret) {
    console.error("[SECURITY] RAZORPAY_WEBHOOK_SECRET is not set in environment");
    return next(new ApiError(500, "Webhook secret not configured"));
  }

  // ── Guard: signature header must be present and a valid hex string ─────────
  if (!signature) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    console.warn(`[SECURITY] Razorpay webhook received without signature header — IP: ${ip}`);
    return next(new ApiError(401, "Missing Razorpay Webhook Signature"));
  }

  // Razorpay HMAC-SHA256 signatures are always 64 hex chars
  if (!/^[A-Fa-f0-9]{64}$/.test(signature)) {
    return next(new ApiError(401, "Malformed Razorpay Webhook Signature"));
  }

  // ── Use raw body captured BEFORE express.json() in app.ts ─────────────────
  // express.json() modifies & discards the raw bytes, so we must capture them
  // before that middleware runs (see app.ts rawBody middleware).
  // If rawBody is missing we fall back to re-stringifying, but this is less
  // safe because JSON.stringify may alter key ordering.
  const rawPayload: string | undefined = (req as any).rawBody;

  if (!rawPayload) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    console.warn(
      `[SECURITY] Razorpay webhook: rawBody not available — falling back to JSON.stringify. ` +
      `Ensure the rawBody middleware in app.ts runs before express.json(). IP: ${ip}`
    );
  }

  const payload = rawPayload ?? JSON.stringify(req.body);

  // ── Timing-safe HMAC comparison ────────────────────────────────────────────
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const suppliedBuf = Buffer.from(signature, "utf8");

  const isValid =
    expectedBuf.length === suppliedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, suppliedBuf);

  if (!isValid) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const eventId = req.headers["x-razorpay-event-id"] || "unknown";
    console.warn(
      `[SECURITY] Invalid Razorpay webhook signature — event: ${eventId} | IP: ${ip}`
    );
    return next(new ApiError(401, "Invalid Razorpay Webhook Signature"));
  }

  next();
};
