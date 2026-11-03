import jwt from "jsonwebtoken";
import { UserType } from "../utils/Role-Access";

// =============================================================================
// SECURITY-HARDENED AUTHENTICATION MIDDLEWARE
// =============================================================================
// FIXES APPLIED:
//   1. No empty-string fallback secret — "" means ANYONE can forge tokens.
//   2. Algorithm pinned to HS256 via `algorithms` option — blocks alg:none attack
//      where an attacker crafts a token with alg:"none" to skip verification.
//   3. Token length bounds check — prevents DoS via multi-MB token strings.
//   4. Decoded payload type guard — jwt.verify can return a string; we reject that.
//   5. UserId sanitization — must be a positive integer or valid UUID string,
//      not arbitrary attacker-controlled data placed into req.user.
// =============================================================================

const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 2048;

// Matches positive integers OR UUID v4 strings
const VALID_ID_REGEX = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function sanitizeId(val: any): string | number | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  // Accept numeric IDs or UUID v4
  if (/^\d+$/.test(str))           return parseInt(str, 10);
  if (VALID_ID_REGEX.test(str))    return str;
  return undefined;  // reject anything that does not match
}

const authenticateMiddleware = (req: any, res: any, next: any): void => {
  try {
    const auth = req.headers.authorization;

    // Must have a Bearer token
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const token = auth.split(" ")[1];

    // --- SECURITY: Reject tokens that are suspiciously short or very long ---
    // Short  = almost certainly garbage / empty.
    // Long   = potential DoS — jwt.verify runs regex + crypto on the full string.
    if (!token || token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    // --- SECURITY: Require JWT_SECRET to be set — no empty-string fallback ---
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      console.error("[Auth] FATAL: JWT_SECRET is not set. Cannot verify tokens.");
      res.status(500).json({ success: false, message: "Server configuration error" });
      return;
    }

    // --- SECURITY: Pin algorithm to HS256 — blocks alg:none attack -----------
    // Without `algorithms`, a crafted token with alg:"none" would pass verify().
    const decoded: any = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    // --- SECURITY: Ensure decoded is a plain object, not a string ------------
    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({ success: false, message: "Invalid token payload" });
      return;
    }

    // Reject refresh tokens used as access tokens
    if (decoded.type === "refresh") {
      res.status(401).json({ success: false, message: "Invalid token type" });
      return;
    }

    // --- SECURITY: Sanitize all ID fields from the token payload -------------
    // These values come from an attacker-controlled JWT payload (after signature
    // verification passes). We must not trust them blindly as arbitrary strings.
    const activeUserId   = sanitizeId(decoded.userId ?? decoded.user_id ?? decoded.id);
    const activeUserType = decoded.userType ?? decoded.user_type;
    const companyId      = sanitizeId(decoded.company_id ?? decoded.companyId);
    const branchId       = sanitizeId(decoded.branch_id  ?? decoded.branchId);
    const roleId         = sanitizeId(decoded.role_id    ?? decoded.roleId);

    if (activeUserId === undefined) {
      res.status(401).json({ success: false, message: "Invalid token: missing user ID" });
      return;
    }

    req.user = {
      id:          activeUserId,
      userId:      activeUserId,
      user_id:     activeUserId,
      companyId,
      company_id:  companyId,
      branchId,
      branch_id:   branchId,
      roleId,
      role_id:     roleId,
      userType:    activeUserType,
      user_type:   activeUserType,
      email:       typeof decoded.email === "string" ? decoded.email.toLowerCase().trim() : undefined,
      roles:       Array.isArray(decoded.roles)       ? decoded.roles       : [],
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
      isSuperAdmin:
        decoded.isSuperAdmin === true ||
        activeUserType === UserType.SUPER_ADMIN,
    };

    next();

  } catch (err: any) {
    // Do NOT leak error details (token expired vs. invalid signature etc.)
    // — both map to 401 Unauthorized.
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export default authenticateMiddleware;
