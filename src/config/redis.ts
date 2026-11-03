import { createClient, RedisClientType } from "redis";

// =============================================================================
// SECURITY-HARDENED REDIS CLIENT
// =============================================================================
// FIXES APPLIED:
//   1. TLS support: rediss:// URLs are auto-detected by the redis client library.
//      No explicit tls: true needed in socket options (TS-compatible).
//      Plain redis:// in production logs a warning — Redis traffic is plaintext.
//   2. Command timeout: commandsQueueMaxLength caps queued commands.
//   3. Reconnect strategy: exponential backoff, stops after MAX_RETRIES.
// =============================================================================

const MAX_RETRIES      = 5;
const SOCKET_TIMEOUT   = 5_000;  // 5s connect timeout
const COMMANDS_BACKLOG = 200;    // reject new commands if queue exceeds this

const rawRedisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isProduction = process.env.NODE_ENV === "production";

// Warn if Redis is plaintext in production (data-in-transit risk)
if (isProduction && rawRedisUrl.startsWith("redis://") && !rawRedisUrl.includes("localhost")) {
  console.warn(
    "[Redis] WARNING: REDIS_URL uses plain redis:// (no TLS) in production. " +
    "Use rediss:// for encrypted Redis connections."
  );
}

// Validate URL scheme
const validSchemes = ["redis://", "rediss://", "unix://"];
const hasValidScheme = validSchemes.some((s) => rawRedisUrl.startsWith(s));
if (!hasValidScheme) {
  console.error("[Redis] SECURITY: REDIS_URL has an unrecognized scheme. Expected redis:// or rediss://");
}

export const redisClient: RedisClientType = createClient({
  url: rawRedisUrl,

  socket: {
    // Connection timeout — fail fast if Redis is unreachable
    connectTimeout: SOCKET_TIMEOUT,

    // NOTE: TLS is automatically enabled when the URL scheme is rediss://.
    // The redis v4 library reads the URL scheme and enables TLS automatically.
    // Do NOT set tls: boolean here — it causes a TypeScript type error because
    // RedisSocketOptions expects either RedisTcpOptions or RedisTlsOptions (not both).

    reconnectStrategy: (retries: number) => {
      if (retries >= MAX_RETRIES) {
        console.warn(`[Redis] Max reconnect attempts (${MAX_RETRIES}) reached. Redis disabled.`);
        // Return an Error to permanently stop reconnection attempts.
        // The app continues without Redis (caching is silently disabled).
        return new Error("Redis max retries exceeded");
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      const delay = Math.min(100 * Math.pow(2, retries), 5_000);
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})...`);
      return delay;
    },
  },

  // Cap the in-memory command queue. If Redis is down and the queue fills up,
  // new commands are rejected immediately rather than queuing indefinitely
  // (which would exhaust memory under sustained traffic).
  commandsQueueMaxLength: COMMANDS_BACKLOG,
});

// ---------------------------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------------------------
redisClient.on("error", (err: any) => {
  // Suppress connection refused — expected when Redis is not running locally
  if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) return;
  // Suppress max-retries-exceeded error (already logged in reconnectStrategy)
  if (err?.message?.includes("max retries")) return;
  console.error("[Redis] Client Error:", err.message || err);
});

redisClient.on("connect",      () => console.log("[Redis] Connecting..."));
redisClient.on("ready",        () => console.log("[Redis] Ready."));
redisClient.on("reconnecting", () => console.log("[Redis] Reconnecting..."));
redisClient.on("end",          () => console.warn("[Redis] Connection closed."));
