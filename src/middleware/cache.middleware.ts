import { Global } from "../../global";

export const cache = (keyPrefix: string, ttl = 60) => {
  return async (req: any, res: any, next: any) => {

    const client = Global.client;

    if (!client) return next();

    // Tenant-aware key: cross-tenant cache leakage is prevented
    const companyId = req.user?.companyId ?? "pub";
    const branchId  = req.user?.branchId  ?? "0";
    const userId    = req.user?.userId    ?? "0";
    const key       = `${companyId}:${branchId}:${userId}:${keyPrefix}:${req.originalUrl}`;

    try {

      const cached = await client.get(key);

      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const original = res.json.bind(res);

      res.json = async (body: any) => {
        await client.setEx(key, ttl, JSON.stringify(body));
        return original(body);
      };

    } catch {
      // Redis unavailable — serve without cache
    }

    next();
  };
};