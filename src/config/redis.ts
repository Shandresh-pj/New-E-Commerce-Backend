import { createClient, RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient: RedisClientType = createClient({
  url: redisUrl,

  socket: {
    reconnectStrategy: (retries) => {
      // exponential backoff (max 2 sec)
      return Math.min(retries * 50, 2000);
    },
  },
});