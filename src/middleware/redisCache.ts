import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";

/**
 * Cache middleware for Express API responses.
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

    const key = `cache:${req.originalUrl || req.url}`;

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

      // Hijack the res.json to save to Redis before sending
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

      // Also hijack res.send if it's used instead of res.json
      const originalSend = res.send.bind(res);
      res.send = (body: any) => {
        // If it's already hijacked by json, we don't want to double cache
        // but if they call send directly with an object, we cache it
        if (res.statusCode >= 200 && res.statusCode < 300 && typeof body === "string") {
            try {
                // Ensure it's valid JSON before caching
                JSON.parse(body);
                redisClient.setEx(key, ttl, body).catch((err: any) => {
                    console.error("Redis Cache Save Error:", err);
                });
            } catch (e) {
                // Not JSON, don't cache
            }
        }
        
        if (!res.getHeader("X-Cache")) {
            res.setHeader("X-Cache", "MISS");
        }
        return originalSend(body);
      };

      next();
    } catch (error) {
      console.error("Redis Cache Error:", error);
      next(); // Continue even if Redis fails
    }
  };
};
