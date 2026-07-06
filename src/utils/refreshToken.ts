import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Global } from "../global";

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

  const client = Global.client;

  if (client) {
    await client.setEx(
      `${PREFIX}:${payload.userId}:${tokenId}`,
      TTL,
      JSON.stringify({ userType: payload.userType, companyId: payload.companyId, branchId: payload.branchId, roleId: payload.roleId })
    );
  }

  return token;
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshPayload | null> {

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.type !== "refresh") return null;

    const client = Global.client;

    if (client) {
      const stored = await client.get(`${PREFIX}:${decoded.userId}:${decoded.tokenId}`);
      if (!stored) return null;
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

  const client = Global.client;

  if (client) {
    await client.del(`${PREFIX}:${userId}:${tokenId}`);
  }
}
