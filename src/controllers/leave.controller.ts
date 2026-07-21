import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { LeaveRequest } from "../entities/leave.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/leave")
export class LeaveController {

  // ==========================================
  // APPLY LEAVE
  // ==========================================
  @Post("/apply")
  @Middleware([authenticateMiddleware])
  @Swagger("Apply Leave", "Employee leave request")
  async apply(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const body = req.body || {};

      if (!body.employee_id && req.user) {
        body.employee_id = req.user.userId || req.user.id;
      }
      if (!body.company_id && req.user) {
        body.company_id = req.user.companyId || req.user.company_id || 1;
      }
      if (!body.branch_id && req.user) {
        body.branch_id = req.user.branchId || req.user.branch_id || 1;
      }
      body.total_days = Number(body.total_days) || 1;
      body.status = body.status || "PENDING";

      const leave = repo.create(body);
      await repo.save(leave);

      return res.json({ success: true, data: leave });
    } catch (err: any) {
      console.error("[LeaveController] apply error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to apply leave" });
    }
  }

  // ==========================================
  // APPROVE LEAVE
  // ==========================================
  @Put("/approve/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Approve Leave", "Approve employee leave request")
  async approve(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid leave ID" });

      await repo.update(id, {
        status: "APPROVED",
        approved_by: req.user?.userId || req.user?.id || null,
        approved_at: new Date().toISOString(),
      });
      return res.json({ success: true, message: "Leave approved" });
    } catch (err: any) {
      console.error("[LeaveController] approve error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to approve leave" });
    }
  }

  // ==========================================
  // REJECT LEAVE
  // ==========================================
  @Put("/reject/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Reject Leave", "Reject employee leave request")
  async reject(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid leave ID" });

      await repo.update(id, {
        status: "REJECTED",
        approved_by: req.user?.userId || req.user?.id || null,
        approved_at: new Date().toISOString(),
      });
      return res.json({ success: true, message: "Leave request rejected" });
    } catch (err: any) {
      console.error("[LeaveController] reject error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to reject leave" });
    }
  }

  // ==========================================
  // DELETE LEAVE
  // ==========================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Leave", "Delete leave request")
  async delete(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid leave ID" });

      const where = TenantService.scopeWhere(req.user, { id });
      const leave = await repo.findOne({ where });
      if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

      await repo.remove(leave);
      return res.json({ success: true, message: "Leave request deleted" });
    } catch (err: any) {
      console.error("[LeaveController] delete error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete leave" });
    }
  }

  // ==========================================
  // GET LEAVE BALANCES
  // ==========================================
  @Get("/balance/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Leave Balance", "Get leave balances for employee")
  async getBalance(req: any, res: Response) {
    try {
      const employee_id = Number(req.params.id);
      if (isNaN(employee_id)) return res.status(400).json({ success: false, message: "Invalid employee ID" });

      const repo = dataSource.getRepository(LeaveRequest);
      const approvedLeaves = await repo.find({
        where: { employee_id, status: "APPROVED" }
      });
      const usedDays: any = { CASUAL: 0, SICK: 0, EMERGENCY: 0, EARNED: 0 };
      approvedLeaves.forEach(l => {
        const type = (l.leave_type || "CASUAL").toUpperCase();
        usedDays[type] = (usedDays[type] || 0) + Number(l.total_days || 0);
      });
      const balances = {
        CASUAL: Math.max(0, 12 - (usedDays["CASUAL"] || 0)),
        SICK: Math.max(0, 10 - (usedDays["SICK"] || 0)),
        EMERGENCY: Math.max(0, 5 - (usedDays["EMERGENCY"] || 0)),
        EARNED: Math.max(0, 15 - (usedDays["EARNED"] || 0)),
        used: usedDays
      };
      return res.json({ success: true, data: balances });
    } catch (err: any) {
      console.error("[LeaveController] getBalance error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to get leave balance" });
    }
  }

  // ==========================================
  // GET LEAVE HISTORY FOR EMPLOYEE
  // ==========================================
  @Get("/history/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Employee Leave History", "Get leave history for specific employee")
  async getHistory(req: any, res: Response) {
    try {
      const employee_id = Number(req.params.id);
      if (isNaN(employee_id)) return res.status(400).json({ success: false, message: "Invalid employee ID" });

      const repo = dataSource.getRepository(LeaveRequest);
      const history = await repo.find({
        where: { employee_id },
        order: { id: "DESC" }
      });
      return res.json({ success: true, data: history });
    } catch (err: any) {
      console.error("[LeaveController] getHistory error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to get leave history" });
    }
  }

  // ==========================================
  // GET ALL LEAVES
  // ==========================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get All Leaves", "Get leaves scoped to user tenant")
  async getAll(req: any, res: Response) {
    try {
      const where = TenantService.scopeWhere(req.user);
      const data = await dataSource.getRepository(LeaveRequest).find({
        where,
        order: { id: "DESC" },
      });
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[LeaveController] getAll error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to get leaves" });
    }
  }
}