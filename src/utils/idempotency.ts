/**
 * Idempotency Utility
 * Prevents duplicate operations using Redis or in-memory fallback
 */

// In-memory fallback store (TTL in ms)
const inMemoryStore = new Map<string, { expires: number }>();

// Cleanup expired in-memory keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of inMemoryStore) {
    if (val.expires < now) inMemoryStore.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Set Idempotency Key ────────────────────────────────────────────────────
export const setIdempotencyKey = async (key: string, ttlSeconds = 86400): Promise<boolean> => {
  try {
    // Try Redis first
    const redis = require("../middleware/redis");
    if (redis && redis.client?.isReady) {
      const result = await redis.client.set(key, "1", { NX: true, EX: ttlSeconds });
      return result === "OK";
    }
  } catch {
    // Fall through to in-memory
  }

  // In-memory fallback
  if (inMemoryStore.has(key)) return false;
  inMemoryStore.set(key, { expires: Date.now() + ttlSeconds * 1000 });
  return true;
};

// ─── Check Idempotency Key ──────────────────────────────────────────────────
export const checkIdempotency = async (key: string): Promise<boolean> => {
  try {
    const redis = require("../middleware/redis");
    if (redis && redis.client?.isReady) {
      const exists = await redis.client.exists(key);
      return exists === 1;
    }
  } catch {
    // Fall through
  }

  const entry = inMemoryStore.get(key);
  if (!entry) return false;
  if (entry.expires < Date.now()) {
    inMemoryStore.delete(key);
    return false;
  }
  return true;
};

// ─── Remove Idempotency Key ─────────────────────────────────────────────────
export const removeIdempotencyKey = async (key: string): Promise<void> => {
  try {
    const redis = require("../middleware/redis");
    if (redis && redis.client?.isReady) {
      await redis.client.del(key);
      return;
    }
  } catch {}
  inMemoryStore.delete(key);
};

// ─── Build attendance idempotency key ──────────────────────────────────────
export const buildAttendanceKey = (employeeId: number, date: string, action: string): string => {
  return `attendance:${action}:emp_${employeeId}:${date}`;
};
