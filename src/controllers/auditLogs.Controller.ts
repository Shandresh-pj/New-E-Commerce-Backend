import { Controller, Get, Delete, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { dataSource } from "../server";
import { AuditLog } from "../entities/auditLogs";
import { UserType } from "../utils/Role-Access";

@Controller("/audit")
export class AuditController {

  // =====================================
  // GET AUDIT LOGS (scoped by role)
  // =====================================

  @Get("/")
  @Middleware([authenticateMiddleware])
  public async getLogs(req: any, res: any) {

    try {

      const repo = dataSource.getRepository(AuditLog);
      const where: any = {};

      if (!req.user.isSuperAdmin) {

        // Admin, Branch, Employee — always scoped to own company
        where.companyId = req.user.companyId;

        // Branch / Employee — further scoped to own branch
        const branchScopedTypes = [
          UserType.BRANCH,
          UserType.BRANCH_MANAGER,
          UserType.SHOPKEEPER,
          UserType.DELIVERY_BOY,
        ];

        if (branchScopedTypes.includes(req.user.userType)) {
          where.branchId = req.user.branchId;
        }

      }

      const logs = await repo.find({
        where,
        order: { createdAt: "DESC" },
        take: 200
      });

      return res.json({
        success: true,
        count: logs.length,
        data: logs
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }

  // =====================================
  // DELETE AUDIT LOG (scoped by role)
  // =====================================

  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  public async deleteLog(req: any, res: any) {

    try {

      const repo = dataSource.getRepository(AuditLog);

      const log = await repo.findOne({
        where: { id: Number(req.params.id) }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          message: "Audit log not found"
        });
      }

      // Scope check — non-super-admins can only delete within their scope
      if (!req.user.isSuperAdmin) {

        if (log.companyId !== req.user.companyId) {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }

        const branchScopedTypes = [
          UserType.BRANCH,
          UserType.BRANCH_MANAGER,
          UserType.SHOPKEEPER,
          UserType.DELIVERY_BOY,
        ];

        if (
          branchScopedTypes.includes(req.user.userType) &&
          log.branchId !== req.user.branchId
        ) {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }

      }

      await repo.delete(log.id);

      return res.json({
        success: true,
        message: "Audit log deleted"
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }

}
