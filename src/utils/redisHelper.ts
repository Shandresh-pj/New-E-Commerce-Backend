const redisClient: any = require("../config/redis");

export const getCache = async (key: string): Promise<any> => {
  const val = await redisClient.get(key);
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  expiry = 60
): Promise<void> => {
  await redisClient.set(key, JSON.stringify(value), { EX: expiry });
};

export default { getCache, setCache };

// Keep CommonJS compatibility
module.exports = {
  getCache,
  setCache,
};