import { Controller, Get, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate";
import { dataSource } from "../server";
import { AuditLog } from "../entities/auditLogs";

@Controller("/audit")
export class AuditController {

  @Get("/")
  @Middleware([authenticateMiddleware])
  public async getLogs(req: any, res: any) {

    const repo = dataSource.getRepository(AuditLog);

    let where: any = {};

    if (!req.user.isSuperAdmin) {
      where.companyId = req.user.company_id;
    }

    if (req.user.role === "Branch") {
      where.branchId = req.user.branch_id;
    }

    const logs = await repo.find({
      where,
      order: { createdAt: "DESC" },
      take: 100
    });

    return res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  }
}