import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger } from "../decorators";
import dataSource from "../config/database";
import { Shift, ShiftAssignment } from "../entities/shift.entity";
import { Employee } from "../entities/employee.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/shifts")
export class ShiftController {

  // ── Create Shift ──────────────────────────────────────────────────────
  @Post("/")
  @Swagger("Create Shift", "Create a new shift configuration")
  async create(req: any, res: Response) {
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
      company_id: req.user.companyId,
      branch_id:  req.user.branchId,
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
  }

  // ── List Shifts ───────────────────────────────────────────────────────
  @Get("/")
  @Swagger("List Shifts", "Get all shifts for the company/branch")
  async getAll(req: any, res: Response) {
    const repo  = dataSource.getRepository(Shift);
    const where = TenantService.scopeWhere(req.user);
    const shifts = await repo.find({ where, order: { id: "DESC" } });
    return res.json({ success: true, data: shifts });
  }

  // ── Get Single Shift ──────────────────────────────────────────────────
  @Get("/:id")
  @Swagger("Shift Details", "Get single shift by ID")
  async getOne(req: any, res: Response) {
    const repo  = dataSource.getRepository(Shift);
    const shift = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });
    return res.json({ success: true, data: shift });
  }

  // ── Update Shift ──────────────────────────────────────────────────────
  @Put("/:id")
  @Swagger("Update Shift", "Update an existing shift")
  async update(req: any, res: Response) {
    const repo  = dataSource.getRepository(Shift);
    const shift = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

    const allowed = [
      "name", "type", "start_time", "end_time", "grace_period_minutes",
      "min_work_minutes", "overtime_threshold_minutes", "late_threshold_minutes",
      "half_day_threshold_minutes", "allowed_break_minutes", "weekend_days", "is_active",
    ];
    allowed.forEach((f) => { if (req.body[f] !== undefined) (shift as any)[f] = req.body[f]; });

    await repo.save(shift);
    return res.json({ success: true, message: "Shift updated", data: shift });
  }

  // ── Delete Shift ──────────────────────────────────────────────────────
  @Delete("/:id")
  @Swagger("Delete Shift", "Delete a shift")
  async delete(req: any, res: Response) {
    const repo  = dataSource.getRepository(Shift);
    const shift = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });
    await repo.remove(shift);
    return res.json({ success: true, message: "Shift deleted" });
  }

  // ── Assign Shift to Employee ──────────────────────────────────────────
  @Post("/assign")
  @Swagger("Assign Shift", "Assign a shift to one or more employees")
  async assign(req: any, res: Response) {
    const assignRepo = dataSource.getRepository(ShiftAssignment);
    const shiftRepo  = dataSource.getRepository(Shift);
    const empRepo    = dataSource.getRepository(Employee);

    const { employee_ids, shift_id, effective_from, effective_to } = req.body;

    if (!employee_ids?.length || !shift_id || !effective_from) {
      return res.status(400).json({ success: false, message: "employee_ids, shift_id, effective_from are required" });
    }

    // Validate shift exists
    const shift = await shiftRepo.findOne({ where: { id: Number(shift_id) } });
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

    const results = [];
    for (const empId of employee_ids) {
      // Deactivate old assignments
      await assignRepo.update(
        { employee_id: Number(empId), is_active: true },
        { is_active: false }
      );

      const assignment = assignRepo.create({
        employee_id:    Number(empId),
        shift_id:       Number(shift_id),
        company_id:     req.user.companyId,
        branch_id:      req.user.branchId,
        effective_from,
        effective_to:   effective_to ?? undefined,
        is_active:      true,
        assigned_by:    req.user.userId,
      });

      await assignRepo.save(assignment);
      results.push(assignment);
    }

    return res.status(201).json({ success: true, message: "Shift assigned", data: results });
  }

  // ── Employee's Active Shift ───────────────────────────────────────────
  @Get("/employee/:employeeId")
  @Swagger("Employee Shift", "Get active shift assignment for a specific employee")
  async employeeShift(req: any, res: Response) {
    const assignRepo = dataSource.getRepository(ShiftAssignment);
    const shiftRepo  = dataSource.getRepository(Shift);

    const assignment = await assignRepo.findOne({
      where: { employee_id: Number(req.params.employeeId), is_active: true },
      order: { id: "DESC" },
    });

    if (!assignment) {
      return res.json({ success: true, data: null, message: "No active shift assignment" });
    }

    const shift = await shiftRepo.findOne({ where: { id: assignment.shift_id } });
    return res.json({ success: true, data: { assignment, shift } });
  }

  // ── List All Assignments ──────────────────────────────────────────────
  @Get("/assignments/all")
  @Swagger("Shift Assignments", "List all shift assignments")
  async assignments(req: any, res: Response) {
    const repo = dataSource.getRepository(ShiftAssignment);
    const where = TenantService.scopeWhere(req.user);
    const assignments = await repo.find({ where, order: { id: "DESC" } });
    return res.json({ success: true, data: assignments });
  }
}
