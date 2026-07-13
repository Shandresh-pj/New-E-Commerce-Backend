import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redisClient } from "../config/redis";

const PREFIX = "refresh_token";
const TTL    = 7 * 24 * 60 * 60; // 7 days in seconds

export interface RefreshPayload {
  userId:    number;
  tokenId:   string;
  userType:  string;
  companyId?: number;
  branchId?:  number;
  roleId?:    number;
}

export async function generateRefreshToken(
  payload: Omit<RefreshPayload, "tokenId">
): Promise<string> {

  const tokenId = crypto.randomBytes(32).toString("hex");

  const token = jwt.sign(
    { ...payload, tokenId, type: "refresh" },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // Store in Redis if available (gracefully skip if Redis is down)
  if (redisClient.isReady) {
    try {
      await redisClient.setEx(
        `${PREFIX}:${payload.userId}:${tokenId}`,
        TTL,
        JSON.stringify({
          userType:  payload.userType,
          companyId: payload.companyId,
          branchId:  payload.branchId,
          roleId:    payload.roleId,
        })
      );
    } catch (err: any) {
      console.warn("⚠️ [RefreshToken] Redis store failed (non-fatal):", err.message);
    }
  }

  return token;
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshPayload | null> {

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.type !== "refresh") return null;

    // Validate against Redis if available
    if (redisClient.isReady) {
      try {
        const stored = await redisClient.get(`${PREFIX}:${decoded.userId}:${decoded.tokenId}`);
        if (!stored) return null;
      } catch (err: any) {
        console.warn("⚠️ [RefreshToken] Redis get failed (non-fatal):", err.message);
        // If Redis is down, fall through and accept the token (JWT signature was already verified)
      }
    }

    return {
      userId:    decoded.userId,
      tokenId:   decoded.tokenId,
      userType:  decoded.userType,
      companyId: decoded.companyId,
      branchId:  decoded.branchId,
      roleId:    decoded.roleId,
    };

  } catch {
    return null;
  }
}

export async function revokeRefreshToken(
  userId: number,
  tokenId: string
): Promise<void> {
  if (redisClient.isReady) {
    try {
      await redisClient.del(`${PREFIX}:${userId}:${tokenId}`);
    } catch (err: any) {
      console.warn("⚠️ [RefreshToken] Redis del failed (non-fatal):", err.message);
    }
  }
}
