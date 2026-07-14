import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

interface CacheEntry {
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry>();

const DUPLICATE_WINDOW = 5000; // 5 seconds

/**
 * Prevents duplicate mutating requests within a short time window.
 *
 * Key fix: Previously the cache key was built from the full serialized
 * request including headers and body. For large requests (file uploads,
 * big JSON payloads), this created 20-50KB keys, causing a memory leak
 * on long-running Render instances.
 *
 * Now the key is hashed with SHA-1, capping it at 40 characters regardless
 * of payload size.
 */
export const preventDuplicateCalls = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Reads are idempotent — deduplicating them breaks page reloads and
    // parallel component loads in the SPA with spurious 429s.
    if (
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
    ) {
      return next();
    }

    const headers = { ...req.headers };
    delete headers.cookie;
    delete headers.authorization;

    // Hash the key to cap memory usage regardless of body size.
    // A raw serialized key for a large upload could be tens of KB;
    // the SHA-1 hash is always exactly 40 characters.
    const rawKey = JSON.stringify({
      url: req.originalUrl,
      ip: req.ip,
      method: req.method,
      // Only include a content-length fingerprint of the body, not the full body,
      // to prevent large payloads from bloating the cache key.
      bodyLength: req.headers["content-length"] ?? 0,
      params: req.params,
    });

    const key = crypto.createHash("sha1").update(rawKey).digest("hex");

    const now = Date.now();
    const existing = requestCache.get(key);

    if (
      existing &&
      now - existing.timestamp < DUPLICATE_WINDOW
    ) {
      res.status(429).json({
        success: false,
        message:
          "Duplicate request detected. Please wait a few seconds and try again.",
      });

      return;
    }

    requestCache.set(key, {
      timestamp: now,
    });

    setTimeout(() => {
      requestCache.delete(key);
    }, DUPLICATE_WINDOW);

    next();
  } catch (error) {
    next(error);
  }
};