

declare const redis: any;

export const cache = (keyPrefix: string, ttl = 60) => {
  return async (req: any, res: any, next: any) => {

    const key = `${keyPrefix}:${req.originalUrl}`;

    const cached = await redis.get(key);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const original = res.json.bind(res);

    res.json = async (body: any) => {
      await redis.setEx(key, ttl, JSON.stringify(body));
      return original(body);
    };

    next();
  };
};