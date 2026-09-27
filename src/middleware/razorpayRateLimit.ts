/**
 * razorpayRateLimit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated, stricter rate-limiter for Razorpay payment endpoints.
 *
 * Why separate from the global limiter?
 *  • Payment surfaces are high-value attack targets (brute-force, replay).
 *  • We need per-IP throttling at 30 req / 15 min — far tighter than the
 *    global 2000 req / 15 min limit applied to all API routes.
 *  • Any violation here is security-sensitive and should be logged.
 */

import rateLimit from "express-rate-limit";

export const razorpayRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,           // 15-minute rolling window
  max: 30,                             // max 30 payment requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(
      `[SECURITY] Razorpay rate-limit exceeded — IP: ${req.ip} | URL: ${req.originalUrl}`
    );
    res.status(429).json({
      success: false,
      message: "Too many payment requests from this IP. Please wait 15 minutes before retrying.",
    });
  },
});
