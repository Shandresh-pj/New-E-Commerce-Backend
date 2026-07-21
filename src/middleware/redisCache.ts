import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";

/**
 * Cache middleware for Express API responses.
 *
 * Key fix: Previously hijacked BOTH res.json AND res.send.
 * Since res.json internally calls res.send, this caused every
 * response to be written to Redis TWICE. Only res.json is intercepted now.
 *
 * @param ttl Time to live in seconds (default 60s)
 */
export const redisCache = (ttl: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Bypass cache if user requests it or in specific conditions
    if (req.query.nocache === "true" || req.query.bypassCache === "true") {
      return next();
    }

    // Generate cache key incorporating authenticated user context if present to avoid cross-user data leakage
    const userId = (req as any).user?.id || (req as any).user?.user_id || '';
    const authHeader = req.headers.authorization ? req.headers.authorization.substring(req.headers.authorization.length - 16) : '';
    const userScope = userId ? `user:${userId}` : authHeader ? `token:${authHeader}` : 'public';
    const key = `cache:${userScope}:${req.originalUrl || req.url}`;

    try {
      if (!redisClient.isReady) {
        return next();
      }

      // Check if data is in Redis
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json");
        res.send(cachedData);
        return;
      }

      // Hijack res.json to save to Redis before sending.
      // We do NOT also hijack res.send because res.json already calls res.send
      // internally — intercepting both would cause double Redis writes.
      const originalJson = res.json.bind(res);

      res.json = (body: any) => {
        // Only cache successful requests
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, ttl, JSON.stringify(body)).catch((err: any) => {
            console.error("Redis Cache Save Error:", err);
          });
        }

        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Redis Cache Error:", error);
      next(); // Continue even if Redis fails
    }
  };
};
