import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { auditMiddleware } from "../middleware/audit.Middleware";
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
    const repo = dataSource.getRepository(LeaveRequest);
    const body = req.body || {};

    if (!body.employee_id && req.user) {
      body.employee_id = req.user.userId;
    }
    if (!body.company_id && req.user) {
      body.company_id = req.user.companyId || 1;
    }
    if (!body.branch_id && req.user) {
      body.branch_id = req.user.branchId || 1;
    }
    body.total_days = Number(body.total_days) || 1;
    body.status = body.status || "PENDING";

    const leave = repo.create(body);
    await repo.save(leave);

    return res.json({ success: true, data: leave });
  }

  // ==========================================
  // APPROVE LEAVE
  // ==========================================
  @Put("/approve/:id")
  async approve(req: any, res: Response) {
    const repo = dataSource.getRepository(LeaveRequest);
    await repo.update(req.params.id, {
      status: "APPROVED",
      approved_by: req.user?.userId || null,
      approved_at: new Date().toISOString(),
    });
    return res.json({ success: true, message: "Leave approved" });
  }

  // ==========================================
  // REJECT LEAVE
  // ==========================================
  @Put("/reject/:id")
  async reject(req: any, res: Response) {
    const repo = dataSource.getRepository(LeaveRequest);
    await repo.update(req.params.id, {
      status: "REJECTED",
      approved_by: req.user?.userId || null,
      approved_at: new Date().toISOString(),
    });
    return res.json({ success: true, message: "Leave request rejected" });
  }

  // ==========================================
  // DELETE LEAVE
  // ==========================================
  @Delete("/:id")
  async delete(req: any, res: Response) {
    const repo = dataSource.getRepository(LeaveRequest);
    const where = TenantService.scopeWhere(req.user, { id: Number(req.params.id) });
    const leave = await repo.findOne({ where });
    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });
    await repo.remove(leave);
    return res.json({ success: true, message: "Leave request deleted" });
  }

  // ==========================================
  // GET LEAVE BALANCES
  // ==========================================
  @Get("/balance/:id")
  async getBalance(req: any, res: Response) {
    const employee_id = Number(req.params.id);
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
  }

  // ==========================================
  // GET LEAVE HISTORY FOR EMPLOYEE
  // ==========================================
  @Get("/history/:id")
  async getHistory(req: any, res: Response) {
    const employee_id = Number(req.params.id);
    const repo = dataSource.getRepository(LeaveRequest);
    const history = await repo.find({
      where: { employee_id },
      order: { id: "DESC" }
    });
    return res.json({ success: true, data: history });
  }

  // ==========================================
  // GET LEAVES
  // ==========================================
  @Get("/")
  async getAll(req: any, res: Response) {
    const where = TenantService.scopeWhere(req.user);
    const data = await dataSource.getRepository(LeaveRequest).find({
      where,
      order: { id: "DESC" },
    });
    return res.json({ success: true, data });
  }
}