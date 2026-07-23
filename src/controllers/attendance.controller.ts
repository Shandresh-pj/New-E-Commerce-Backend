import { Request, Response } from "express";
import { IsNull } from "typeorm";
import { Controller, Get, Post, Put, Delete, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { auditMiddleware } from "../middleware/audit.Middleware";
import dataSource from "../config/database";
import { AttendanceService } from "../services/attendance.service";
import { Attendance, AttendanceStatus, AttendanceSource, BreakType, AttendanceBreakLog } from "../entities/attendance.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { nowDate, nowTime } from "../utils/dateTime";
import moment from "moment";

const attendanceService = new AttendanceService();

@Controller("/attendance")
export class AttendanceController {

  // ══════════════════════════════════════════════════════════════════════
  // CHECK-IN
  // ══════════════════════════════════════════════════════════════════════
  @Post("/check-in")
  @Middleware([authenticateMiddleware])
  @Swagger("Check In", "Employee check in with automatic shift detection and late marking")
  async checkIn(req: any, res: Response) {
    try {
      const user = req.user;
      const { employee_id, company_id, branch_id, source, gps_lat, gps_lng, idempotency_key } = req.body;

      const empId = employee_id ?? (user?.userId || user?.id);
      if (!empId) {
        return res.status(400).json({ success: false, message: "employee_id is required" });
      }

      let compId = company_id ? Number(company_id) : (user?.company_id || user?.companyId);
      let bId = branch_id ? Number(branch_id) : (user?.branch_id || user?.branchId);

      if (!compId || !bId) {
        const empRepo = dataSource.getRepository(require("../entities/employee").Employee);
        const emp = await empRepo.findOne({ where: { id: Number(empId) } });
        if (emp) {
          if (!compId) compId = emp.company_id;
          if (!bId) bId = emp.branch_id;
        }
      }

      if (!compId || !bId) {
        return res.status(400).json({ success: false, message: "company_id and branch_id are required. Please select or assign employee to a company/branch." });
      }

      const attendance = await attendanceService.processCheckIn({
        employee_id: Number(empId),
        company_id:  Number(compId),
        branch_id:   Number(bId),
        source:      source ?? AttendanceSource.WEB,
        ip_address:  req.ip,
        gps_lat:     gps_lat ? Number(gps_lat) : undefined,
        gps_lng:     gps_lng ? Number(gps_lng) : undefined,
        idempotency_key,
      });

      return res.status(201).json({ success: true, message: "Check-in recorded", data: attendance });
    } catch (err: any) {
      console.error("Error in checkIn:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to process check-in" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECK-OUT
  // ══════════════════════════════════════════════════════════════════════
  @Post("/check-out/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Check Out", "Employee check-out with automatic time/deduction computation")
  async checkOut(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { gps_lat, gps_lng } = req.body;

      const result = await attendanceService.processCheckOut(Number(id), {
        ip_address: req.ip,
        gps_lat:    gps_lat ? Number(gps_lat) : undefined,
        gps_lng:    gps_lng ? Number(gps_lng) : undefined,
      });

      return res.json({ success: true, message: "Check-out recorded", data: result });
    } catch (err: any) {
      console.error("Error in checkOut:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to process check-out" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // BREAK START
  // ══════════════════════════════════════════════════════════════════════
  @Post("/break-in")
  @Middleware([authenticateMiddleware])
  @Swagger("Break Start", "Start an employee break session with policy validation")
  async breakIn(req: any, res: Response) {
    try {
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
    } catch (err: any) {
      console.error("Error in breakIn:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to start break" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // BREAK END
  // ══════════════════════════════════════════════════════════════════════
  @Post("/break-out/:breakLogId")
  @Middleware([authenticateMiddleware])
  @Swagger("Break End", "End an employee break, compute duration, apply deduction rules")
  async breakOut(req: any, res: Response) {
    try {
      const { breakLogId } = req.params;
      const result = await attendanceService.processBreakEnd(Number(breakLogId));
      return res.json({ success: true, message: "Break ended", data: result });
    } catch (err: any) {
      console.error("Error in breakOut:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to end break" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // LIVE DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  @Get("/dashboard")
  @Middleware([authenticateMiddleware])
  @Swagger("Live Dashboard", "Real-time attendance metrics: present/absent/break/late counts")
  async dashboard(req: any, res: Response) {
    try {
      const companyId = req.user?.company_id || req.user?.companyId;
      const branchId  = req.query.branch_id ? Number(req.query.branch_id) : (req.user?.branch_id || req.user?.branchId);
      const metrics   = await attendanceService.getLiveDashboard(companyId ? Number(companyId) : undefined, branchId ? Number(branchId) : undefined);
      return res.json({ success: true, data: metrics });
    } catch (err: any) {
      console.error("Error in dashboard:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch dashboard metrics" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ATTENDANCE LIST
  // ══════════════════════════════════════════════════════════════════════
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Attendance List", "Get paginated attendance records with filters")
  async getAll(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(Attendance);
      const where  = TenantService.scopeWhere(req.user);
      const { date, employee_id, status, company_id, branch_id } = req.query;

      if (date && date !== 'undefined' && date !== 'null') {
        where.attendance_date = date;
      }
      if (employee_id && employee_id !== 'undefined' && employee_id !== 'null' && !isNaN(Number(employee_id))) {
        where.employee_id = Number(employee_id);
      }
      if (company_id && company_id !== 'ALL' && company_id !== 'undefined' && company_id !== 'null' && !isNaN(Number(company_id))) {
        where.company_id = Number(company_id);
      }
      if (branch_id && branch_id !== 'ALL' && branch_id !== 'undefined' && branch_id !== 'null' && !isNaN(Number(branch_id))) {
        where.branch_id = Number(branch_id);
      }
      if (status && status !== 'undefined' && status !== 'null') {
        where.status = status as AttendanceStatus;
      }

      const page  = Math.max(1, Number(req.query.page ?? 1) || 1);
      const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 50) || 50));

      const [records, total] = await repo.findAndCount({
        where,
        order:  { id: "DESC" },
        skip:   (page - 1) * limit,
        take:   limit,
      });

      return res.json({ success: true, data: records, total, page, limit });
    } catch (err: any) {
      console.error("Error in getAll:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch attendance records", data: [], total: 0 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // TODAY'S STATUS FOR EMPLOYEE
  // ══════════════════════════════════════════════════════════════════════
  @Get("/today")
  @Middleware([authenticateMiddleware])
  @Swagger("Today's Attendance", "Get current employee's attendance for today")
  async today(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const today = nowDate();
      const rawEmpId = req.query.employee_id;
      const empId = (rawEmpId && rawEmpId !== 'undefined' && rawEmpId !== 'null' && !isNaN(Number(rawEmpId)))
        ? Number(rawEmpId)
        : (req.user?.userId || req.user?.id);

      if (!empId) {
        return res.json({ success: true, data: { attendance: null, activeBreak: null } });
      }

      const whereClause: any = {
        employee_id: empId,
        attendance_date: today,
      };

      const companyId = req.user?.company_id || req.user?.companyId;
      if (companyId) {
        whereClause.company_id = Number(companyId);
      }

      const record = await repo.findOne({
        where: whereClause,
      });

      let activeBreak = null;
      if (record) {
        const breakRepo = dataSource.getRepository(AttendanceBreakLog);
        activeBreak = await breakRepo.findOne({
          where: { attendance_id: record.id, end_time: IsNull() },
        });
      }

      return res.json({ success: true, data: { attendance: record, activeBreak } });
    } catch (err: any) {
      console.error("Error in today:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch today status", data: { attendance: null, activeBreak: null } });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // EMPLOYEE HISTORY
  // ══════════════════════════════════════════════════════════════════════
  @Get("/employee/:employeeId")
  @Middleware([authenticateMiddleware])
  @Swagger("Employee History", "Get full attendance history for a specific employee")
  async employeeHistory(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const targetEmpId = Number(req.params.employeeId);
      if (isNaN(targetEmpId)) {
        return res.status(400).json({ success: false, message: "Invalid employee ID" });
      }

      const where = TenantService.scopeWhere(req.user, {
        employee_id: targetEmpId,
      });

      const page  = Math.max(1, Number(req.query.page ?? 1) || 1);
      const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 50) || 50));

      const [records, total] = await repo.findAndCount({
        where,
        order: { id: "DESC" },
        skip:  (page - 1) * limit,
        take:  limit,
      });

      return res.json({ success: true, data: records, total });
    } catch (err: any) {
      console.error("Error in employeeHistory:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch employee history", data: [], total: 0 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SINGLE ATTENDANCE RECORD
  // ══════════════════════════════════════════════════════════════════════
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Attendance Details", "Get single attendance record with break logs")
  async getOne(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const breakRepo = dataSource.getRepository(AttendanceBreakLog);
      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        return res.status(400).json({ success: false, message: "Invalid attendance ID" });
      }

      const record = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id: targetId }),
      });
      if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

      const breaks = await breakRepo.find({ where: { attendance_id: record.id }, order: { id: "ASC" } });

      return res.json({ success: true, data: { ...record, breaks } });
    } catch (err: any) {
      console.error("Error in getOne:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch attendance details" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // GET BREAK LOGS
  // ══════════════════════════════════════════════════════════════════════
  @Get("/breaks/:attendanceId")
  @Middleware([authenticateMiddleware])
  @Swagger("Attendance Breaks", "Get all break logs for a specific attendance record")
  async getBreaks(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const targetId = Number(req.params.attendanceId);
      if (isNaN(targetId)) {
        return res.status(400).json({ success: false, message: "Invalid attendance ID" });
      }

      const record = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id: targetId }),
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
    } catch (err: any) {
      console.error("Error in getBreaks:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch break logs" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MANUAL LOG (Admin)
  // ══════════════════════════════════════════════════════════════════════
  @Post("/manual")
  @Middleware([authenticateMiddleware])
  @Swagger("Manual Attendance", "Admin manually create an attendance record")
  async manual(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const {
        employee_id, attendance_date, check_in, check_out,
        status, branch_id, note,
      } = req.body;

      if (!employee_id || !attendance_date || !check_in) {
        return res.status(400).json({ success: false, message: "employee_id, attendance_date, check_in are required" });
      }

      const existing = await repo.findOne({
        where: { employee_id: Number(employee_id), attendance_date },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "Attendance already exists for this date" });
      }

      let total_minutes = 0;
      if (check_out) {
        total_minutes = moment(check_out, "HH:mm:ss").diff(moment(check_in, "HH:mm:ss"), "minutes");
        if (total_minutes < 0) total_minutes += 24 * 60;
      }

      const compId = req.user?.company_id || req.user?.companyId || 1;
      const bId = branch_id ? Number(branch_id) : (req.user?.branch_id || req.user?.branchId || 1);

      const record = repo.create({
        employee_id: Number(employee_id),
        company_id:  Number(compId),
        branch_id:   Number(bId),
        attendance_date,
        check_in,
        check_out,
        total_minutes,
        net_worked_minutes: total_minutes,
        status:        status ?? AttendanceStatus.PRESENT,
        source:        AttendanceSource.MANUAL,
        is_regularized: true,
        regularized_by: req.user?.userId || req.user?.id,
        regularized_at: nowDate(),
        regularization_note: note ?? "Manual entry by admin",
      });

      await repo.save(record);
      return res.status(201).json({ success: true, message: "Manual attendance created", data: record });
    } catch (err: any) {
      console.error("Error in manual:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create manual log" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // REGULARIZE (Admin Override)
  // ══════════════════════════════════════════════════════════════════════
  @Post("/regularize/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Regularize Attendance", "Admin override attendance record")
  async regularize(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const record = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

      const { status, check_in, check_out, note } = req.body;

      if (status)    record.status    = status;
      if (check_in)  record.check_in  = check_in;
      if (check_out) record.check_out = check_out;

      if (check_in && check_out) {
        record.total_minutes = moment(check_out, "HH:mm:ss").diff(moment(check_in, "HH:mm:ss"), "minutes");
        if (record.total_minutes < 0) record.total_minutes += 24 * 60;
        record.net_worked_minutes = record.total_minutes - (record.break_minutes || 0);
      }

      record.is_regularized     = true;
      record.regularized_by     = req.user?.userId || req.user?.id;
      record.regularized_at     = nowDate();
      record.regularization_note = note;

      await repo.save(record);
      return res.json({ success: true, message: "Attendance regularized", data: record });
    } catch (err: any) {
      console.error("Error in regularize:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to regularize attendance" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // APPROVE
  // ══════════════════════════════════════════════════════════════════════
  @Post("/approve/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Approve Attendance", "Manager/HR approve an attendance record")
  async approve(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const record = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

      record.is_approved = true;
      record.approved_by = req.user?.userId || req.user?.id;
      record.approved_at = nowDate();

      await repo.save(record);
      return res.json({ success: true, message: "Attendance approved", data: record });
    } catch (err: any) {
      console.error("Error in approve:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to approve attendance" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════════════
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Attendance", "Admin update attendance record fields")
  async update(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const record = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
      });
      if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });

      const allowed = ["status", "check_in", "check_out", "shift_id", "shift_name"];
      allowed.forEach((f) => { if (req.body[f] !== undefined) (record as any)[f] = req.body[f]; });

      if (record.check_in && record.check_out) {
        record.total_minutes = moment(record.check_out, "HH:mm:ss").diff(moment(record.check_in, "HH:mm:ss"), "minutes");
        if (record.total_minutes < 0) record.total_minutes += 24 * 60;
        record.net_worked_minutes  = record.total_minutes - (record.break_minutes || 0);
      }

      await repo.save(record);
      return res.json({ success: true, message: "Attendance updated", data: record });
    } catch (err: any) {
      console.error("Error in update:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to update attendance" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Attendance", "Admin delete attendance record")
  async delete(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const record = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
      });
      if (!record) return res.status(404).json({ success: false, message: "Attendance not found" });
      await repo.remove(record);
      return res.json({ success: true, message: "Attendance deleted" });
    } catch (err: any) {
      console.error("Error in delete:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete attendance" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // DAILY REPORT
  // ══════════════════════════════════════════════════════════════════════
  @Get("/report/daily")
  @Middleware([authenticateMiddleware])
  @Swagger("Daily Report", "Full daily attendance report for the company/branch")
  async dailyReport(req: any, res: Response) {
    try {
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
    } catch (err: any) {
      console.error("Error in dailyReport:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to generate daily report" });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MONTHLY REPORT
  // ══════════════════════════════════════════════════════════════════════
  @Get("/report/monthly")
  @Middleware([authenticateMiddleware])
  @Swagger("Monthly Report", "Monthly attendance summary per employee")
  async monthlyReport(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(Attendance);
      const { month, year, employee_id } = req.query;

      const where: any = TenantService.scopeWhere(req.user);
      if (employee_id && employee_id !== 'undefined' && employee_id !== 'null' && !isNaN(Number(employee_id))) {
        where.employee_id = Number(employee_id);
      }

      const records = await repo.find({ where, order: { employee_id: "ASC", attendance_date: "ASC" } });

      const filtered = records.filter((r) => {
        let dateStr = r.attendance_date || "";
        let yyyy = 0, mm = 0;
        if (dateStr.includes("-")) {
          const parts = dateStr.split("-");
          yyyy = Number(parts[0]);
          mm = Number(parts[1]);
        } else if (dateStr.includes(":")) {
          const parts = dateStr.split(":");
          if (parts[0].length === 4) {
            yyyy = Number(parts[0]);
            mm = Number(parts[1]);
          } else {
            mm = Number(parts[1]);
            yyyy = Number(parts[2]);
          }
        }
        const monthMatch = month ? mm === Number(month) : true;
        const yearMatch  = year  ? yyyy === Number(year)  : true;
        return monthMatch && yearMatch;
      });

      return res.json({ success: true, data: filtered, total: filtered.length });
    } catch (err: any) {
      console.error("Error in monthlyReport:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to generate monthly report", data: [], total: 0 });
    }
  }
}