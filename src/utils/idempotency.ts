/**
 * Idempotency Utility
 * Prevents duplicate operations using Redis or in-memory fallback.
 * Uses the central Redis client from config/redis.ts.
 */

import { redisClient } from "../config/redis";

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
// Returns true if the key was newly set (operation is safe to proceed).
// Returns false if the key already exists (operation is a duplicate).
export const setIdempotencyKey = async (key: string, ttlSeconds = 86400): Promise<boolean> => {
  try {
    if (redisClient.isReady) {
      const result = await redisClient.set(key, "1", { NX: true, EX: ttlSeconds });
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
    if (redisClient.isReady) {
      const exists = await redisClient.exists(key);
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
    if (redisClient.isReady) {
      await redisClient.del(key);
      return;
    }
  } catch {}
  inMemoryStore.delete(key);
};

// ─── Build attendance idempotency key ──────────────────────────────────────
export const buildAttendanceKey = (employeeId: number, date: string, action: string): string => {
  return `attendance:${action}:emp_${employeeId}:${date}`;
};
