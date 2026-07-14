import dataSource from "../config/database";
import { AuditLog } from "../entities/auditLogs";
import { getDiff } from "../utils/getDiff";

/**
 * Audit middleware — logs CREATE, UPDATE, and DELETE operations to the audit_logs table.
 *
 * Key fixes:
 * 1. Skips GET/HEAD/OPTIONS requests — reads are not auditable events.
 * 2. Skips error responses (4xx/5xx) — only audit successful mutations.
 * 3. Wraps the entire "finish" handler in try/catch to prevent unhandled
 *    promise rejections if the DB is momentarily unavailable.
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
          ip:        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
          device:    req.headers["user-agent"] as string,
          diff:      { request: req.body, response: responseBody },
        });

      } catch (err) {
        // Never let audit failures crash the server or leak as unhandled rejections
        console.error("[Audit] Failed to save audit log:", err);
      }
    });

    next();
  };
};