import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { Shift, ShiftAssignment } from "../entities/shift.entity";
import { Employee } from "../entities/employee.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/shifts")
export class ShiftController {

  // ── Create Shift ──────────────────────────────────────────────────────
  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Shift", "Create a new shift configuration")
  async create(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Shift);
      const {
        name, type, start_time, end_time,
        grace_period_minutes, min_work_minutes, overtime_threshold_minutes,
        late_threshold_minutes, half_day_threshold_minutes, allowed_break_minutes, weekend_days,
      } = req.body;

      if (!name || !type || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: "name, type, start_time, end_time are required" });
      }

      const shift = repo.create({
        company_id: req.user?.companyId || req.user?.company_id || 1,
        branch_id:  req.user?.branchId || req.user?.branch_id || 1,
        name, type,
        start_time, end_time,
        grace_period_minutes:       grace_period_minutes ?? 15,
        min_work_minutes:           min_work_minutes ?? 480,
        overtime_threshold_minutes: overtime_threshold_minutes ?? 480,
        late_threshold_minutes:     late_threshold_minutes ?? 15,
        half_day_threshold_minutes: half_day_threshold_minutes ?? 240,
        allowed_break_minutes:      allowed_break_minutes ?? 60,
        weekend_days:               weekend_days ?? [0, 6],
      });

      await repo.save(shift);
      return res.status(201).json({ success: true, message: "Shift created", data: shift });
    } catch (err: any) {
      console.error("[ShiftController] create error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to create shift" });
    }
  }

  // ── List Shifts ───────────────────────────────────────────────────────
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("List Shifts", "Get all shifts for the company/branch")
  async getAll(req: any, res: Response) {
    try {
      const repo  = dataSource.getRepository(Shift);
      const where = TenantService.scopeWhere(req.user);
      const shifts = await repo.find({ where, order: { id: "DESC" } });
      return res.json({ success: true, data: shifts });
    } catch (err: any) {
      console.error("[ShiftController] getAll error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch shifts" });
    }
  }

  // ── Get Single Shift ──────────────────────────────────────────────────
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Shift Details", "Get single shift by ID")
  async getOne(req: any, res: Response) {
    try {
      const repo  = dataSource.getRepository(Shift);
      const id    = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid shift ID" });

      const shift = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });
      return res.json({ success: true, data: shift });
    } catch (err: any) {
      console.error("[ShiftController] getOne error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch shift details" });
    }
  }

  // ── Update Shift ──────────────────────────────────────────────────────
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Shift", "Update an existing shift")
  async update(req: any, res: Response) {
    try {
      const repo  = dataSource.getRepository(Shift);
      const id    = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid shift ID" });

      const shift = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

      const allowed = [
        "name", "type", "start_time", "end_time", "grace_period_minutes",
        "min_work_minutes", "overtime_threshold_minutes", "late_threshold_minutes",
        "half_day_threshold_minutes", "allowed_break_minutes", "weekend_days"
      ];
      allowed.forEach((f) => { if (req.body[f] !== undefined) (shift as any)[f] = req.body[f]; });

      if (req.body.is_active !== undefined) {
        shift.is_active = req.body.is_active === true || req.body.is_active === "true" || req.body.is_active === 1 || req.body.is_active === "1";
      }

      await repo.save(shift);
      return res.json({ success: true, message: "Shift updated", data: shift });
    } catch (err: any) {
      console.error("[ShiftController] update error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update shift" });
    }
  }

  // ── Delete Shift ──────────────────────────────────────────────────────
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Shift", "Delete a shift")
  async delete(req: any, res: Response) {
    try {
      const repo  = dataSource.getRepository(Shift);
      const id    = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid shift ID" });

      const shift = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });
      await repo.remove(shift);
      return res.json({ success: true, message: "Shift deleted" });
    } catch (err: any) {
      console.error("[ShiftController] delete error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete shift" });
    }
  }

  // ── Assign Shift to Employee ──────────────────────────────────────────
  @Post("/assign")
  @Middleware([authenticateMiddleware])
  @Swagger("Assign Shift", "Assign a shift to one or more employees")
  async assign(req: any, res: Response) {
    try {
      const assignRepo = dataSource.getRepository(ShiftAssignment);
      const shiftRepo  = dataSource.getRepository(Shift);

      const { employee_ids, shift_id, effective_from, effective_to } = req.body;

      if (!employee_ids?.length || !shift_id || !effective_from) {
        return res.status(400).json({ success: false, message: "employee_ids, shift_id, effective_from are required" });
      }

      const shift = await shiftRepo.findOne({ where: { id: Number(shift_id) } });
      if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

      const results = [];
      for (const empId of employee_ids) {
        await assignRepo.update(
          { employee_id: Number(empId), is_active: true },
          { is_active: false }
        );

        const assignment = assignRepo.create({
          employee_id:    Number(empId),
          shift_id:       Number(shift_id),
          company_id:     req.user?.companyId || req.user?.company_id || 1,
          branch_id:      req.user?.branchId || req.user?.branch_id || 1,
          effective_from,
          effective_to:   effective_to ?? undefined,
          is_active:      true,
          assigned_by:    req.user?.userId || req.user?.id || null,
        });

        await assignRepo.save(assignment);
        results.push(assignment);
      }

      return res.status(201).json({ success: true, message: "Shift assigned", data: results });
    } catch (err: any) {
      console.error("[ShiftController] assign error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to assign shift" });
    }
  }

  // ── Employee's Active Shift ───────────────────────────────────────────
  @Get("/employee/:employeeId")
  @Middleware([authenticateMiddleware])
  @Swagger("Employee Shift", "Get active shift assignment for a specific employee")
  async employeeShift(req: any, res: Response) {
    try {
      const assignRepo = dataSource.getRepository(ShiftAssignment);
      const shiftRepo  = dataSource.getRepository(Shift);

      const empId = Number(req.params.employeeId);
      if (isNaN(empId)) return res.status(400).json({ success: false, message: "Invalid employee ID" });

      const assignment = await assignRepo.findOne({
        where: { employee_id: empId, is_active: true },
        order: { id: "DESC" },
      });

      if (!assignment) {
        return res.json({ success: true, data: null, message: "No active shift assignment" });
      }

      const shift = await shiftRepo.findOne({ where: { id: assignment.shift_id } });
      return res.json({ success: true, data: { assignment, shift } });
    } catch (err: any) {
      console.error("[ShiftController] employeeShift error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch employee shift" });
    }
  }

  // ── List All Assignments ──────────────────────────────────────────────
  @Get("/assignments/all")
  @Middleware([authenticateMiddleware])
  @Swagger("Shift Assignments", "List all shift assignments")
  async assignments(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(ShiftAssignment);
      const where = TenantService.scopeWhere(req.user);
      const assignments = await repo.find({ where, order: { id: "DESC" } });
      return res.json({ success: true, data: assignments });
    } catch (err: any) {
      console.error("[ShiftController] assignments error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch shift assignments" });
    }
  }
}
