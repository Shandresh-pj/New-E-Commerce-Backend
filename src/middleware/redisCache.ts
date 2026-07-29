import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function setMemoryCache(key: string, value: string, ttlSeconds: number) {
  if (memoryCache.size > 1000) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function getMemoryCache(key: string): string | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.includes(pattern)) {
      memoryCache.delete(k);
    }
  }
}

/**
 * High-speed caching middleware for Express API responses.
 * Uses Redis when available and ultra-fast in-memory LRU cache as fallback (<1ms response time).
 */
export const redisCache = (ttl: number = 30) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Invalidate cache on mutations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const resourcePath = req.baseUrl || req.originalUrl || req.url;
      const cleanPath = resourcePath.replace(/\/api\//, "").split("?")[0].split("/")[0];
      invalidateApiCache(cleanPath);
      return next();
    }

    if (req.method !== "GET") {
      return next();
    }

    if (req.query.nocache === "true" || req.query.bypassCache === "true") {
      return next();
    }

    const userId = (req as any).user?.id || (req as any).user?.user_id || "";
    const authHeader = req.headers.authorization
      ? req.headers.authorization.substring(req.headers.authorization.length - 16)
      : "";
    const userScope = userId ? `user:${userId}` : authHeader ? `token:${authHeader}` : "public";
    const key = `cache:${userScope}:${req.originalUrl || req.url}`;

    // 1. Fast Memory Cache Check (<1ms)
    const memData = getMemoryCache(key);
    if (memData) {
      res.setHeader("X-Cache", "HIT-MEMORY");
      res.setHeader("Content-Type", "application/json");
      res.send(memData);
      return;
    }

    // 2. Redis Cache Check
    try {
      if (redisClient.isReady) {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
          setMemoryCache(key, cachedData, ttl);
          res.setHeader("X-Cache", "HIT-REDIS");
          res.setHeader("Content-Type", "application/json");
          res.send(cachedData);
          return;
        }
      }
    } catch (err) {
      console.error("Redis Read Error:", err);
    }

    // 3. Hijack res.json to store in memory & Redis
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const stringified = JSON.stringify(body);
        setMemoryCache(key, stringified, ttl);

        if (redisClient.isReady) {
          redisClient.setEx(key, ttl, stringified).catch((err: any) => {
            console.error("Redis Cache Save Error:", err);
          });
        }
      }

      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
};
