import { createClient, RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient: RedisClientType = createClient({
  url: redisUrl,

  socket: {
    reconnectStrategy: (retries) => {
      // Stop retrying after 5 attempts to prevent console spam
      if (retries > 5) {
        console.warn("⚠️ Redis max retries reached. Stopping reconnection attempts.");
        return new Error("Max retries reached");
      }
      // exponential backoff (max 2 sec)
      return Math.min(retries * 50, 2000);
    },
  },
});

redisClient.on("error", (err: any) => {
  if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) return;
  console.error("❌ Redis Client Error", err);
});
redisClient.on("connect", () => console.log("⏳ Redis connecting..."));
redisClient.on("ready", () => console.log("✅ Redis Client Ready"));
redisClient.on("end", () => console.log("⚠️ Redis Client Disconnected"));