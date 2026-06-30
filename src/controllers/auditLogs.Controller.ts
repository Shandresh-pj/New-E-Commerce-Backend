import { Controller, Get, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate";
import { dataSource } from "../server";
import { AuditLog } from "../entities/auditLogs";
import { UserType } from "../utils/Role-Access";

@Controller("/audit")
export class AuditController {

  @Get("/")
  @Middleware([authenticateMiddleware])
  public async getLogs(req: any, res: any) {

    const repo = dataSource.getRepository(AuditLog);

    let where: any = {};

    if (!req.user.isSuperAdmin) {
      where.companyId = req.user.companyId;
    }

    if (
      req.user.userType === UserType.BRANCH_MANAGER ||
      req.user.userType === UserType.STAFF_KEEPER
    ) {
      where.branchId = req.user.branchId;
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