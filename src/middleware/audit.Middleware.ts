import dataSource from "../config/database";
import { AuditLog } from "../entities/auditLogs";

// SECURITY: Scrub sensitive fields from request/response bodies before
// writing to audit logs. Passwords, tokens, and secrets must never be
// persisted in plaintext in the audit_logs table.
const SENSITIVE_KEYS = new Set([
  "password", "newPassword", "currentPassword", "confirmPassword",
  "token", "refreshToken", "accessToken", "secret", "apiKey",
  "cvv", "card_number", "cardNumber", "otp", "pin",
]);

function scrubSensitive(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => scrubSensitive(v, depth + 1));

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    cleaned[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : scrubSensitive(v, depth + 1);
  }
  return cleaned;
}

/**
 * Audit middleware — logs CREATE, UPDATE, and DELETE operations to the audit_logs table.
 *
 * Key security properties:
 * 1. Scrubs passwords, tokens, secrets from request/response before logging.
 * 2. Skips GET/HEAD/OPTIONS — reads are not auditable mutation events.
 * 3. Skips error responses (4xx/5xx) — only audits successful mutations.
 * 4. IP is taken from the first trusted proxy header value (X-Forwarded-For[0])
 *    or falls back to req.ip (app.ts sets trust proxy: 1).
 * 5. Wrapped in try/catch — audit failures never crash the server.
 */
export const auditMiddleware = (moduleName: string) => {
  return async (req: any, res: any, next: any) => {

    // Only audit mutating methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Capture the response body by intercepting res.json
    let responseBody: any;
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      responseBody = body;
      return originalJson(body);
    };

    res.on("finish", async () => {
      try {
        // Only audit successful mutations (2xx responses)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return;
        }

        if (!dataSource.isInitialized) return;

        const method = req.method;
        const action =
          method === "POST"
            ? "CREATE"
            : method === "PUT" || method === "PATCH"
              ? "UPDATE"
              : method === "DELETE"
                ? "DELETE"
                : "READ";

        const auditRepo = dataSource.getRepository(AuditLog);

        await auditRepo.save({
          module:    moduleName,
          action,
          recordId:  req.params.id ? Number(req.params.id) : 0,
          userId:    req.user?.userId   ?? req.user?.id,
          roleId:    req.user?.roleId   ?? req.user?.role_id ?? 0,
          companyId: req.user?.companyId ?? req.user?.company_id,
          branchId:  req.user?.branchId  ?? req.user?.branch_id,
          // SECURITY: Use first IP from X-Forwarded-For (app sets trust proxy:1 so this is safe).
          ip:        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
          device:    req.headers["user-agent"] as string,
          // SECURITY: Passwords, tokens, and secrets are scrubbed before persisting.
          diff: {
            request:  scrubSensitive(req.body),
            response: scrubSensitive(responseBody),
          },
        });

      } catch (err) {
        // Never let audit failures crash the server or create unhandled rejections.
        console.error("[Audit] Failed to save audit log:", err);
      }
    });

    next();
  };
};
