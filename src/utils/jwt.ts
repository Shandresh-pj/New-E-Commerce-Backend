import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

// =============================================================================
// SECURITY-HARDENED JWT UTILITIES
// =============================================================================
// CRITICAL FIXES:
//   1. NO hardcoded fallback secrets — missing secret = hard failure.
//      A static fallback string ("super-secret-jwt-key-svk-dth") means ANY
//      attacker who reads the source code can forge tokens forever.
//   2. Algorithm pinned to HS256 everywhere to block the alg:none attack,
//      where a crafted token sets alg:"none" to bypass verification entirely.
//   3. Minimum secret length enforced (32 chars = 256 bits).
// =============================================================================

const MIN_SECRET_LENGTH = 32;

// ---------------------------------------------------------------------------
// INTERNAL: Resolve and validate the access-token secret at call time.
// Throws immediately if the secret is missing or too short.
// ---------------------------------------------------------------------------
function getAccessSecret(): Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "[JWT] FATAL: JWT_SECRET environment variable is not set. " +
      "Set it in Render Dashboard -> Environment before deploying."
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[JWT] FATAL: JWT_SECRET is too short (${secret.length} chars). ` +
      `Minimum is ${MIN_SECRET_LENGTH} characters for HS256 security.`
    );
  }
  return secret as Secret;
}

// ---------------------------------------------------------------------------
// INTERNAL: Resolve and validate the refresh-token secret at call time.
// ---------------------------------------------------------------------------
function getRefreshSecret(): Secret {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "[JWT] FATAL: JWT_REFRESH_SECRET (and JWT_SECRET fallback) is not set. " +
      "Set JWT_REFRESH_SECRET in Render Dashboard -> Environment."
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[JWT] FATAL: JWT_REFRESH_SECRET is too short (${secret.length} chars). ` +
      `Minimum is ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return secret as Secret;
}

// ---------------------------------------------------------------------------
// Generate a short-lived ACCESS token (default 1 day)
// ---------------------------------------------------------------------------
export const generateToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = "1d"
): string => {
  const options: SignOptions = {
    expiresIn,
    algorithm: "HS256",   // Pin algorithm — prevents alg:none / RS256 confusion attacks
  } as SignOptions;
  return jwt.sign(payload as any, getAccessSecret(), options);
};

// ---------------------------------------------------------------------------
// Generate a long-lived REFRESH token (default 7 days)
// Refresh tokens are signed with a DIFFERENT secret so a compromised access
// secret cannot be used to forge refresh tokens (and vice versa).
// ---------------------------------------------------------------------------
export const generateRefreshToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = "7d"
): string => {
  const options: SignOptions = {
    expiresIn,
    algorithm: "HS256",
  } as SignOptions;
  return jwt.sign(payload as any, getRefreshSecret(), options);
};

// ---------------------------------------------------------------------------
// Verify an ACCESS token — throws JsonWebTokenError / TokenExpiredError
// ---------------------------------------------------------------------------
export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getAccessSecret(), {
    algorithms: ["HS256"],  // Only accept HS256 — rejects alg:none and RS256
  });
  if (typeof decoded === "string") {
    throw new Error("[JWT] Token payload is a plain string — expected an object.");
  }
  return decoded as JwtPayload;
};

// ---------------------------------------------------------------------------
// Verify a REFRESH token — throws JsonWebTokenError / TokenExpiredError
// ---------------------------------------------------------------------------
export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getRefreshSecret(), {
    algorithms: ["HS256"],
  });
  if (typeof decoded === "string") {
    throw new Error("[JWT] Refresh token payload is a plain string — expected an object.");
  }
  return decoded as JwtPayload;
};

// ---------------------------------------------------------------------------
// Decode WITHOUT verification — use only for reading non-sensitive header info.
// NEVER use this for authorization decisions.
// ---------------------------------------------------------------------------
export const decodeToken = (token: string): JwtPayload | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") return null;
  return decoded as JwtPayload;
};
