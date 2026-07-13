import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";

const DEFAULT_EXPIRY = Number(process.env.REDIS_EXPIRY) || 60;
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "cache:";

export const redisMiddleware = (duration: number = DEFAULT_EXPIRY) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip if Redis is not ready — never block a request because of caching
      if (!redisClient.isReady) {
        return next();
      }

      // Only cache GET requests
      if (req.method !== "GET") {
        return next();
      }

      const key = `${KEY_PREFIX}${req.originalUrl}`;
      const cached = await redisClient.get(key);

      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader("X-Cache", "HIT");
        res.status(200).json({ ...data, cache: true });
        return;
      }

      const originalJson = res.json.bind(res);

      res.json = (body: any) => {
        (async () => {
          try {
            await redisClient.set(key, JSON.stringify(body), { EX: duration });
          } catch (err) {
            console.error("Redis Cache Save Error:", err);
          }
        })();
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Redis Middleware Error:", err);
      next();
    }
  };
};

export default redisMiddleware;