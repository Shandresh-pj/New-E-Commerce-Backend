import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { Controller, Get, Post, Put, Delete, Swagger } from "../decorators";
import dataSource from "../config/database";
import { AttendanceService } from "../services/attendance.service";
import { Attendance, AttendanceStatus, AttendanceSource, BreakType } from "../entities/attendance.entity";
import { AttendanceBreakLog } from "../entities/attendance.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { nowDate, nowTime } from "../utils/dateTime";

const attendanceService = new AttendanceService();

@Controller("/attendance")
export class AttendanceController {

  // ══════════════════════════════════════════════════════════════════════
  // CHECK-IN
  // ══════════════════════════════════════════════════════════════════════
  @Post("/check-in")
  @Swagger("Check In", "Employee check in with automatic shift detection and late marking")
  async checkIn(req: any, res: Response) {
    const user = req.user;
    const { employee_id, source, gps_lat, gps_lng, idempotency_key } = req.body;

    const empId = employee_id ?? user.userId;
    if (!empId) {
      return res.status(400).json({ success: false, message: "employee_id is required" });
    }

    const attendance = await attendanceService.processCheckIn({
      employee_id: Number(empId),
      company_id:  user.companyId,
      branch_id:   user.branchId,
      source:      source ?? AttendanceSource.WEB,
      ip_address:  req.ip,
      gps_lat:     gps_lat ? Number(gps_lat) : undefined,
      gps_lng:     gps_lng ? Number(gps_lng) : undefined,
      idempotency_key,
    });

    return res.status(201).json({ success: true, message: "Check-in recorded", data: attendance });
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECK-OUT
  // ══════════════════════════════════════════════════════════════════════
  @Post("/check-out/:id")
  @Swagger("Check Out", "Employee check-out with automatic time/deduction computation")
  async checkOut(req: any, res: Response) {
    const { id } = req.params;
    const { gps_lat, gps_lng } = req.body;

    const result = await attendanceService.processCheckOut(Number(id), {
      ip_address: req.ip,
      gps_lat:    gps_lat ? Number(gps_lat) : undefined,
      gps_lng:    gps_lng ? Number(gps_lng) : undefined,
    });

    return res.json({ success: true, message: "Check-out recorded", data: result });
  }

  // ══════════════════════════════════════════════════════════════════════
  // BREAK START
  // ══════════════════════════════════════════════════════════════════════
  @Post("/break-in")
  @Swagger("Break Start", "Start an employee break session with policy validation")
  async breakIn(req: any, res: Response) {
    const { attendance_id, break_type, break_policy_id } = req.body;

    if (!attendance_id) {
      return res.status(400).json({ success: false, message: "attendance_id is required" });
    }

    const breakLog = await attendanceService.processBreakStart(
      Number(attendance_id),
      break_type ?? BreakType.PERSONAL,
      { break_policy_id: break_policy_id ? Number(break_policy_id) : undefined }
    );

    return res.status(201).json({ success: true, message: "Break started", data: breakLog });
  }

  // ══════════════════════════════════════════════════════════════════════
  // BREAK END
  // ══════════════════════════════════════════════════════════════════════
  @Post("/break-out/:breakLogId")
  @Swagger("Break End", "End an employee break, compute duration, apply deduction rules")
  async breakOut(req: any, res: Response) {
    const { breakLogId } = req.params;
    const result = await attendanceService.processBreakEnd(Number(breakLogId));
    return res.json({ success: true, message: "Break ended", data: result });
  }

  // ══════════════════════════════════════════════════════════════════════
  // LIVE DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  @Get("/dashboard")
  @Swagger("Live Dashboard", "Real-time attendance metrics: present/absent/break/late counts")
  async dashboard(req: any, res: Response) {
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branchId;
    const metrics  = await attendanceService.getLiveDashboard(req.user.companyId, branchId);
    return res.json({ success: true, data: metrics });
  }

  // ══════════════════════════════════════════════════════════════════════
  // ATTENDANCE LIST
  // ══════════════════════════════════════════════════════════════════════
  @Get("/")
  @Swagger("Attendance List", "Get paginated attendance records with filters")
  async getAll(req: any, res: Response) {
    const repo   = dataSource.getRepository(Attendance);
    const where  = TenantService.scopeWhere(req.user);
    const { date, employee_id, status } = req.query;

    if (date)        where.attendance_date = date;
    if (employee_id) where.employee_id     = Number(employee_id);
    if (status)      where.status          = status as AttendanceStatus;

    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const [records, total] = await repo.findAndCount({
      where,
      order:  { id: "DESC" },
      skip:   (page - 1) * limit,
      take:   limit,
    });

    return res.json({ success: true, data: records, total, page, limit });
  }

  // ══════════════════════════════════════════════════════════════════════
  // TODAY'S STATUS FOR EMPLOYEE
  // ══════════════════════════════════════════════════════════════════════
  @Get("/today")
  @Swagger("Today's Attendance", "Get current employee's attendance for today")
  async today(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const today = nowDate();
    const empId = req.query.employee_id ? Number(req.query.employee_id) : req.user.userId;

    const record = await repo.findOne({
      where: {
        employee_id: empId,
        company_id:  req.user.companyId,
        attendance_date: today,
      },
    });

    let activeBreak = null;
    if (record) {
      const breakRepo = dataSource.getRepository(AttendanceBreakLog);
      activeBreak = await breakRepo.findOne({
        where: { attendance_id: record.id, end_time: IsNull() },
      });
    }

    return res.json({ success: true, data: { attendance: record, activeBreak } });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EMPLOYEE HISTORY
  // ══════════════════════════════════════════════════════════════════════
  @Get("/employee/:employeeId")
  @Swagger("Employee History", "Get full attendance history for a specific employee")
  async employeeHistory(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const where = TenantService.scopeWhere(req.user, {
      employee_id: Number(req.params.employeeId),
    });

    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const [records, total] = await repo.findAndCount({
      where,
      order: { id: "DESC" },
      skip:  (page - 1) * limit,
      take:  limit,
    });

    return res.json({ success: true, data: records, total });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SINGLE ATTENDANCE RECORD
  // ══════════════════════════════════════════════════════════════════════
  @Get("/:id")
  @Swagger("Attendance Details", "Get single attendance record with break logs")
  async getOne(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const breakRepo = dataSource.getRepository(AttendanceBreakLog);

    const record = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

    const breaks = await breakRepo.find({ where: { attendance_id: record.id }, order: { id: "ASC" } });

    return res.json({ success: true, data: { ...record, breaks } });
  }

  // ══════════════════════════════════════════════════════════════════════
  // GET BREAK LOGS
  // ══════════════════════════════════════════════════════════════════════
  @Get("/breaks/:attendanceId")
  @Swagger("Attendance Breaks", "Get all break logs for a specific attendance record")
  async getBreaks(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const record = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.attendanceId) }),
    });
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    const breakRepo = dataSource.getRepository(AttendanceBreakLog);
    const breaks = await breakRepo.find({
      where: { attendance_id: record.id },
      order: { id: "ASC" }
    });
    return res.json({ success: true, data: breaks });
  }

  // ══════════════════════════════════════════════════════════════════════
  // MANUAL LOG (Admin)
  // ══════════════════════════════════════════════════════════════════════
  @Post("/manual")
  @Swagger("Manual Attendance", "Admin manually create an attendance record")
  async manual(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const {
      employee_id, attendance_date, check_in, check_out,
      status, branch_id, note,
    } = req.body;

    if (!employee_id || !attendance_date || !check_in) {
      return res.status(400).json({ success: false, message: "employee_id, attendance_date, check_in are required" });
    }

    // Guard duplicate
    const existing = await repo.findOne({
      where: { employee_id: Number(employee_id), attendance_date },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Attendance already exists for this date" });
    }

    let total_minutes = 0;
    if (check_out) {
      const { default: moment } = await import("moment");
      total_minutes = moment(check_out, "HH:mm:ss").diff(moment(check_in, "HH:mm:ss"), "minutes");
    }

    const record = repo.create({
      employee_id: Number(employee_id),
      company_id:  req.user.companyId,
      branch_id:   Number(branch_id ?? req.user.branchId),
      attendance_date,
      check_in,
      check_out,
      total_minutes,
      net_worked_minutes: total_minutes,
      status:        status ?? AttendanceStatus.PRESENT,
      source:        AttendanceSource.MANUAL,
      is_regularized: true,
      regularized_by: req.user.userId,
      regularized_at: nowDate(),
      regularization_note: note ?? "Manual entry by admin",
    });

    await repo.save(record);
    return res.status(201).json({ success: true, message: "Manual attendance created", data: record });
  }

  // ══════════════════════════════════════════════════════════════════════
  // REGULARIZE (Admin Override)
  // ══════════════════════════════════════════════════════════════════════
  @Post("/regularize/:id")
  @Swagger("Regularize Attendance", "Admin override attendance record")
  async regularize(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const record = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

    const { status, check_in, check_out, note } = req.body;

    if (status)    record.status    = status;
    if (check_in)  record.check_in  = check_in;
    if (check_out) record.check_out = check_out;

    if (check_in && check_out) {
      const { default: moment } = await import("moment");
      record.total_minutes = moment(check_out, "HH:mm:ss").diff(moment(check_in, "HH:mm:ss"), "minutes");
      record.net_worked_minutes = record.total_minutes - (record.break_minutes || 0);
    }

    record.is_regularized     = true;
    record.regularized_by     = req.user.userId;
    record.regularized_at     = nowDate();
    record.regularization_note = note;

    await repo.save(record);
    return res.json({ success: true, message: "Attendance regularized", data: record });
  }

  // ══════════════════════════════════════════════════════════════════════
  // APPROVE
  // ══════════════════════════════════════════════════════════════════════
  @Post("/approve/:id")
  @Swagger("Approve Attendance", "Manager/HR approve an attendance record")
  async approve(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const record = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

    record.is_approved = true;
    record.approved_by = req.user.userId;
    record.approved_at = nowDate();

    await repo.save(record);
    return res.json({ success: true, message: "Attendance approved", data: record });
  }

  // ══════════════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════════════
  @Put("/:id")
  @Swagger("Update Attendance", "Admin update attendance record fields")
  async update(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const record = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

    const allowed = ["status", "check_in", "check_out", "shift_id", "shift_name"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) (record as any)[f] = req.body[f]; });

    if (record.check_in && record.check_out) {
      const { default: moment } = await import("moment");
      record.total_minutes       = moment(record.check_out, "HH:mm:ss").diff(moment(record.check_in, "HH:mm:ss"), "minutes");
      record.net_worked_minutes  = record.total_minutes - (record.break_minutes || 0);
    }

    await repo.save(record);
    return res.json({ success: true, message: "Attendance updated", data: record });
  }

  // ══════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════
  @Delete("/:id")
  @Swagger("Delete Attendance", "Admin delete attendance record")
  async delete(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const record = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });
    await repo.remove(record);
    return res.json({ success: true, message: "Attendance deleted" });
  }

  // ══════════════════════════════════════════════════════════════════════
  // DAILY REPORT
  // ══════════════════════════════════════════════════════════════════════
  @Get("/report/daily")
  @Swagger("Daily Report", "Full daily attendance report for the company/branch")
  async dailyReport(req: any, res: Response) {
    const repo  = dataSource.getRepository(Attendance);
    const date  = (req.query.date as string) ?? nowDate();
    const where: any = TenantService.scopeWhere(req.user, { attendance_date: date });

    const records = await repo.find({ where, order: { id: "ASC" } });

    const summary = {
      date,
      total:        records.length,
      present:      records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
      late:         records.filter((r) => r.status === AttendanceStatus.LATE).length,
      half_day:     records.filter((r) => r.status === AttendanceStatus.HALF_DAY).length,
      absent:       records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      leave:        records.filter((r) => r.status === AttendanceStatus.LEAVE).length,
      work_from_home: records.filter((r) => r.status === AttendanceStatus.WORK_FROM_HOME).length,
      overtime:     records.filter((r) => r.overtime_minutes > 0).length,
      avg_work_minutes: records.length
        ? Math.round(records.reduce((s, r) => s + r.net_worked_minutes, 0) / records.length)
        : 0,
      records,
    };

    return res.json({ success: true, data: summary });
  }

  // ══════════════════════════════════════════════════════════════════════
  // MONTHLY REPORT
  // ══════════════════════════════════════════════════════════════════════
  @Get("/report/monthly")
  @Swagger("Monthly Report", "Monthly attendance summary per employee")
  async monthlyReport(req: any, res: Response) {
    const repo = dataSource.getRepository(Attendance);
    const { month, year, employee_id } = req.query;

    const where: any = TenantService.scopeWhere(req.user);
    if (employee_id) where.employee_id = Number(employee_id);

    const records = await repo.find({ where, order: { employee_id: "ASC", attendance_date: "ASC" } });

    // Filter to requested month/year via date string
    const filtered = records.filter((r) => {
      const [, mm, yyyy] = r.attendance_date.split(":");
      const monthMatch = month ? Number(mm) === Number(month) : true;
      const yearMatch  = year  ? Number(yyyy) === Number(year)  : true;
      return monthMatch && yearMatch;
    });

    return res.json({ success: true, data: filtered, total: filtered.length });
  }
}