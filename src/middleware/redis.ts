import { Request, Response, NextFunction } from "express";
import { Global } from "../../global";

const REDIS_EXPIRY: number =
  Number(process.env.REDIS_EXPIRY) || 60;
const REDIS_KEY_PREFIX: string =
  process.env.REDIS_KEY_PREFIX || "";

export const redisMiddleware = (
  duration: number = REDIS_EXPIRY
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const redis = Global.client;

      if (!redis || !redis.isReady) {
        next();
        return;
      }

      if (req.method !== "GET") {
        next();
        return;
      }

      const key = `${REDIS_KEY_PREFIX}${req.method}:${req.originalUrl}`;

      const cached = await redis.get(key);

      if (cached && duration > 0) {
        const data = JSON.parse(cached);

        data.cache = true;

        res.setHeader("X-Cache-Hit", "true");
        res.status(200).json(data);
        return;
      }

      const originalJson = res.json.bind(res);

      res.json = ((body: any) => {
        (async () => {
          try {
            await redis.set(
              key,
              JSON.stringify(body),
              { EX: duration }
            );
          } catch (err) {
            console.error(err);
          }
        })();

        return originalJson(body);
      }) as typeof res.json;

      next();
    } catch (err) {
      console.error("Redis Middleware Error:", err);
      next();
    }
  };
};

export default redisMiddleware;