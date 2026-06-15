import { Request, Response, NextFunction } from "express";
import { Global } from "../../global";

const DEFAULT_EXPIRY =
  Number(process.env.REDIS_EXPIRY) || 60;

const KEY_PREFIX =
  process.env.REDIS_KEY_PREFIX || "cache:";

export const redisMiddleware = (
  duration: number = DEFAULT_EXPIRY
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const redis = Global.client;

      // ===============================
      // SKIP IF REDIS NOT READY
      // ===============================
      if (!redis || !redis.isOpen) {
        return next();
      }

      // ===============================
      // ONLY CACHE GET REQUESTS
      // ===============================
      if (req.method !== "GET") {
        return next();
      }

      const key = `${KEY_PREFIX}${req.originalUrl}`;

      // ===============================
      // CHECK CACHE
      // ===============================
      const cached = await redis.get(key);

      if (cached) {
        const data = JSON.parse(cached);

        res.setHeader("X-Cache", "HIT");

        res.status(200).json({
          ...data,
          cache: true,
        });

        return;
      }

      // ===============================
      // OVERRIDE RESPONSE
      // ===============================
      const originalJson = res.json.bind(res);

      res.json = (body: any) => {
        (async () => {
          try {
            await redis.set(
              key,
              JSON.stringify(body),
              {
                EX: duration,
              }
            );
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