import { dataSource } from "../server";
import { AuditLog } from "../entities/auditLogs";
import { getDiff } from "../utils/getDiff";

export const auditMiddleware = (moduleName: string) => {
  return async (req: any, res: any, next: any) => {

    const auditRepo = dataSource.getRepository(AuditLog);

    const oldSend = res.json;

    let oldBody: any;

    res.json = function (body: any) {
      oldBody = body;
      return oldSend.call(this, body);
    };

    res.on("finish", async () => {

      try {

        const method = req.method;

        const action =
          method === "POST"
            ? "CREATE"
            : method === "PUT"
              ? "UPDATE"
              : method === "DELETE"
                ? "DELETE"
                : "READ";

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
          diff:      { request: req.body, response: oldBody },
        });

      } catch (err) {
        console.log("Audit error:", err);
      }
    });

    next();
  };
};