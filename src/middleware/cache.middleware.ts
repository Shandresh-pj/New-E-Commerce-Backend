import { redisClient } from "../config/redis";

export const cache = (keyPrefix: string, ttl = 60) => {
  return async (req: any, res: any, next: any) => {

    // Skip if Redis is not connected — never block a request because of caching
    if (!redisClient.isReady) return next();

    // Tenant-aware key: prevent cross-tenant cache leakage
    const companyId = req.user?.companyId ?? "pub";
    const branchId  = req.user?.branchId  ?? "0";
    const userId    = req.user?.userId    ?? "0";
    const key       = `${companyId}:${branchId}:${userId}:${keyPrefix}:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);

      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const original = res.json.bind(res);

      res.json = async (body: any) => {
        redisClient.setEx(key, ttl, JSON.stringify(body)).catch((err: any) => {
          console.error("Cache setEx error:", err.message);
        });
        return original(body);
      };

    } catch {
      // Redis unavailable — serve without cache
    }

    next();
  };
};