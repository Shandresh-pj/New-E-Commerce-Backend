import { createClient, RedisClientType } from "redis";

const client: RedisClientType<any, any> = createClient({
  url: process.env.REDIS_URL,
});

client.on("connect", () => {
  console.log("✅ Redis Connected");
});

client.on("error", (err: any) => {
  console.log("❌ Redis Error", err);
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

export default client;

// Keep CommonJS compatibility
module.exports = client;