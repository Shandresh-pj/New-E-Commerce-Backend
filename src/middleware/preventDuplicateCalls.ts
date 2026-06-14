import { Request, Response, NextFunction } from "express";

interface CacheEntry {
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry>();

const DUPLICATE_WINDOW = 5000; // 5 seconds

export const preventDuplicateCalls = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const headers = { ...req.headers };

    delete headers.cookie;
    delete headers.authorization;

    const key = JSON.stringify({
      url: req.originalUrl,
      ip: req.ip,
      headers,
      body: req.body,
      params: req.params,
      query: req.query,
    });

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