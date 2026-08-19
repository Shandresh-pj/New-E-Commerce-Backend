import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { LeaveRequest } from "../entities/leave.entity";
import { Employee } from "../entities/employee.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { emitToUser, emitToCompany } from "../socket/socket";

// ── Helper: emit real-time leave status event ──────────────────────────────
function emitLeaveStatusChanged(leave: any, status: string, actorId?: number) {
  try {
    const payload = {
      leaveId:     leave.id,
      employee_id: leave.employee_id,
      status,
      leave_type:  leave.leave_type,
      from_date:   leave.from_date,
      to_date:     leave.to_date,
      approved_by: actorId ?? leave.approved_by,
      timestamp:   new Date().toISOString(),
    };
    // Notify the employee directly
    if (leave.employee_id) {
      emitToUser(leave.employee_id, "leave.status.changed", payload);
    }
    // Notify company admins / managers watching the leave dashboard
    if (leave.company_id) {
      emitToCompany(leave.company_id, "leave.status.changed", payload);
    }
  } catch (e) {
    // Never crash the HTTP response just because socket emit failed
    console.error("[LeaveController] socket emit failed:", e);
  }
}

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

      const actorId = req.user?.userId || req.user?.id || null;
      await repo.update(id, {
        status: "APPROVED",
        approved_by: actorId,
        approved_at: new Date().toISOString(),
      });

      // Real-time notification to employee & company room
      const leave = await repo.findOne({ where: { id } });
      if (leave) emitLeaveStatusChanged(leave, "APPROVED", actorId);

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

      const actorId = req.user?.userId || req.user?.id || null;
      await repo.update(id, {
        status: "REJECTED",
        approved_by: actorId,
        approved_at: new Date().toISOString(),
      });

      // Real-time notification to employee & company room
      const leave = await repo.findOne({ where: { id } });
      if (leave) emitLeaveStatusChanged(leave, "REJECTED", actorId);

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
  // UPDATE LEAVE
  // ==========================================
  @Put("/update/:id")
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Leave", "Update employee leave request details")
  async update(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid leave ID" });

      const where = TenantService.scopeWhere(req.user, { id });
      const leave = await repo.findOne({ where });
      if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

      const body = req.body || {};

      if (body.leave_type !== undefined) leave.leave_type = body.leave_type;
      if (body.from_date !== undefined) leave.from_date = body.from_date;
      if (body.to_date !== undefined) leave.to_date = body.to_date;
      if (body.total_days !== undefined) leave.total_days = Number(body.total_days) || leave.total_days;
      if (body.reason !== undefined) leave.reason = body.reason;
      if (body.employee_id !== undefined) leave.employee_id = Number(body.employee_id) || leave.employee_id;
      if (body.company_id !== undefined) leave.company_id = Number(body.company_id) || leave.company_id;
      if (body.branch_id !== undefined) leave.branch_id = Number(body.branch_id) || leave.branch_id;
      const prevStatus = leave.status;
      if (body.status !== undefined) {
        leave.status = body.status;
        if (body.status === "APPROVED" || body.status === "REJECTED") {
          leave.approved_by = req.user?.userId || req.user?.id || null;
          leave.approved_at = new Date().toISOString();
        }
      }

      await repo.save(leave);

      // Emit real-time event only when status actually changed
      if (body.status !== undefined && body.status !== prevStatus &&
          (body.status === "APPROVED" || body.status === "REJECTED" || body.status === "PENDING")) {
        emitLeaveStatusChanged(leave, leave.status, req.user?.userId || req.user?.id || null);
      }

      return res.json({ success: true, message: "Leave request updated successfully", data: leave });
    } catch (err: any) {
      console.error("[LeaveController] update error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update leave request" });
    }
  }

  // ==========================================
  // GET LEAVE BY ID
  // ==========================================
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Leave By ID", "Get leave request by ID")
  async getById(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(LeaveRequest);
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid leave ID" });

      const where = TenantService.scopeWhere(req.user, { id });
      const leave = await repo.findOne({ where });
      if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

      return res.json({ success: true, data: leave });
    } catch (err: any) {
      console.error("[LeaveController] getById error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to get leave request" });
    }
  }


  // ==========================================
  // GET LEAVE BALANCES
  // ==========================================
  @Get("/balance/:id?")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Leave Balance", "Get leave balances for employee")
  async getBalance(req: any, res: Response) {
    try {
      const idParam = req.params.id;
      let employee_id = Number(idParam || req.query.employee_id || req.query.employeeId);

      if (isNaN(employee_id) || employee_id <= 0) {
        if (req.user) {
          const empRepo = dataSource.getRepository(Employee);
          const emp = await empRepo.findOne({
            where: [
              { email: req.user.email },
              { id: req.user.userId || req.user.id }
            ]
          });
          if (emp) employee_id = emp.id;
          else employee_id = Number(req.user.userId || req.user.id || 1);
        } else {
          employee_id = 1;
        }
      }

      if (isNaN(employee_id) || employee_id <= 0) employee_id = 1;

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
  @Get("/history/:id?")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Employee Leave History", "Get leave history for specific employee")
  async getHistory(req: any, res: Response) {
    try {
      const idParam = req.params.id;
      let employee_id = Number(idParam || req.query.employee_id || req.query.employeeId);

      if (isNaN(employee_id) || employee_id <= 0) {
        if (req.user) {
          const empRepo = dataSource.getRepository(Employee);
          const emp = await empRepo.findOne({
            where: [
              { email: req.user.email },
              { id: req.user.userId || req.user.id }
            ]
          });
          if (emp) employee_id = emp.id;
          else employee_id = Number(req.user.userId || req.user.id || 1);
        } else {
          employee_id = 1;
        }
      }

      if (isNaN(employee_id) || employee_id <= 0) employee_id = 1;

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