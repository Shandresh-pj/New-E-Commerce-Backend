import { Request, Response } from "express";
import { Controller, Get, Post, Swagger } from "../decorators";
import dataSource from "../config/database";
import { AttendanceService } from "../services/attendance.service";
import { NotificationService } from "../services/notification.service";
import { Attendance, AttendanceStatus } from "../entities/attendance.entity";
import { AttendanceNotification } from "../entities/attendance_notification.entity";
import { Employee } from "../entities/employee.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { nowDate } from "../utils/dateTime";

const attendanceService  = new AttendanceService();
const notificationService = new NotificationService();

@Controller("/workforce")
export class WorkforceDashboardController {

  // ── Live Real-Time Metrics ────────────────────────────────────────────
  @Get("/live")
  @Swagger("Live Dashboard", "Real-time workforce attendance metrics for the dashboard")
  async live(req: any, res: Response) {
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branchId;
    const metrics  = await attendanceService.getLiveDashboard(req.user.companyId, branchId);

    return res.json({ success: true, data: metrics });
  }

  // ── Extended Live View with Employee Details ──────────────────────────
  @Get("/live/details")
  @Swagger("Live Details", "Live attendance with employee details for each record")
  async liveDetails(req: any, res: Response) {
    const repo    = dataSource.getRepository(Attendance);
    const empRepo = dataSource.getRepository(Employee);
    const today   = nowDate();

    const where: any = TenantService.scopeWhere(req.user, { attendance_date: today });
    if (req.query.branch_id) where.branch_id = Number(req.query.branch_id);

    const records = await repo.find({ where, order: { id: "DESC" } });

    // Enrich with employee data
    const enriched = await Promise.all(
      records.map(async (r) => {
        const emp = await empRepo.findOne({ where: { id: r.employee_id } });
        return {
          ...r,
          employee: emp
            ? {
                name:         emp.name,
                designation:  emp.designation,
                department:   emp.department,
                employee_code: emp.employee_code,
                profile_image: emp.profile_image,
              }
            : null,
        };
      })
    );

    return res.json({ success: true, data: enriched, total: enriched.length });
  }

  // ── Daily Report ──────────────────────────────────────────────────────
  @Get("/report/daily")
  @Swagger("Daily Report", "Complete daily attendance report")
  async dailyReport(req: any, res: Response) {
    const repo  = dataSource.getRepository(Attendance);
    const date  = (req.query.date as string) ?? nowDate();
    const where = TenantService.scopeWhere(req.user, { attendance_date: date });
    if (req.query.branch_id) (where as any).branch_id = Number(req.query.branch_id);

    const records = await repo.find({ where, order: { employee_id: "ASC" } });

    const totalEmployees = await dataSource.getRepository(Employee).count({
      where: TenantService.scopeWhere(req.user, { status: true }),
    });

    return res.json({
      success: true,
      data: {
        date,
        total_employees:  totalEmployees,
        present_count:    records.filter((r) => [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.HALF_DAY].includes(r.status)).length,
        absent_count:     totalEmployees - records.length,
        late_count:       records.filter((r) => r.status === AttendanceStatus.LATE).length,
        half_day_count:   records.filter((r) => r.status === AttendanceStatus.HALF_DAY).length,
        leave_count:      records.filter((r) => r.status === AttendanceStatus.LEAVE).length,
        wfh_count:        records.filter((r) => r.status === AttendanceStatus.WORK_FROM_HOME).length,
        overtime_count:   records.filter((r) => r.overtime_minutes > 0).length,
        avg_work_minutes: records.length
          ? Math.round(records.reduce((s, r) => s + r.net_worked_minutes, 0) / records.length)
          : 0,
        records,
      },
    });
  }

  // ── Monthly Report ────────────────────────────────────────────────────
  @Get("/report/monthly")
  @Swagger("Monthly Report", "Monthly workforce attendance summary grouped by employee")
  async monthlyReport(req: any, res: Response) {
    const { month, year, branch_id } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required" });
    }

    const repo    = dataSource.getRepository(Attendance);
    const empRepo = dataSource.getRepository(Employee);

    const where: any = TenantService.scopeWhere(req.user);
    if (branch_id) where.branch_id = Number(branch_id);

    const records = await repo.find({ where, order: { employee_id: "ASC" } });

    // Filter to month/year
    const filtered = records.filter((r) => {
      const [, mm, yyyy] = r.attendance_date.split(":");
      return Number(mm) === Number(month) && Number(yyyy) === Number(year);
    });

    // Group by employee
    const grouped: Record<number, any> = {};
    for (const r of filtered) {
      if (!grouped[r.employee_id]) {
        const emp = await empRepo.findOne({ where: { id: r.employee_id } });
        grouped[r.employee_id] = {
          employee_id: r.employee_id,
          employee:    emp ? { name: emp.name, designation: emp.designation, employee_code: emp.employee_code } : null,
          present:     0,
          absent:      0,
          late:        0,
          half_day:    0,
          leave:       0,
          wfh:         0,
          overtime_minutes: 0,
          total_work_minutes: 0,
        };
      }
      const g = grouped[r.employee_id];
      if (r.status === AttendanceStatus.PRESENT)         g.present++;
      if (r.status === AttendanceStatus.LATE)            g.late++;
      if (r.status === AttendanceStatus.HALF_DAY)        g.half_day++;
      if (r.status === AttendanceStatus.ABSENT)          g.absent++;
      if (r.status === AttendanceStatus.LEAVE)           g.leave++;
      if (r.status === AttendanceStatus.WORK_FROM_HOME)  g.wfh++;
      g.overtime_minutes    += r.overtime_minutes || 0;
      g.total_work_minutes  += r.net_worked_minutes || 0;
    }

    return res.json({
      success: true,
      data: Object.values(grouped),
      total_records: filtered.length,
    });
  }

  // ── Employee Monthly Report ───────────────────────────────────────────
  @Get("/report/employee/:employeeId")
  @Swagger("Employee Report", "Detailed monthly report for a single employee")
  async employeeReport(req: any, res: Response) {
    const { month, year } = req.query;
    const empId = Number(req.params.employeeId);

    const repo    = dataSource.getRepository(Attendance);
    const empRepo = dataSource.getRepository(Employee);

    const employee = await empRepo.findOne({ where: { id: empId } });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    const records = await repo.find({
      where: TenantService.scopeWhere(req.user, { employee_id: empId }),
      order: { attendance_date: "DESC" },
    });

    const filtered = month && year
      ? records.filter((r) => {
          const [, mm, yyyy] = r.attendance_date.split(":");
          return Number(mm) === Number(month) && Number(yyyy) === Number(year);
        })
      : records;

    return res.json({
      success: true,
      data: {
        employee: {
          name:         employee.name,
          designation:  employee.designation,
          department:   employee.department,
          employee_code: employee.employee_code,
        },
        summary: {
          total:      filtered.length,
          present:    filtered.filter((r) => r.status === AttendanceStatus.PRESENT).length,
          late:       filtered.filter((r) => r.status === AttendanceStatus.LATE).length,
          half_day:   filtered.filter((r) => r.status === AttendanceStatus.HALF_DAY).length,
          absent:     filtered.filter((r) => r.status === AttendanceStatus.ABSENT).length,
          leave:      filtered.filter((r) => r.status === AttendanceStatus.LEAVE).length,
          overtime_minutes: filtered.reduce((s, r) => s + (r.overtime_minutes || 0), 0),
          total_work_minutes: filtered.reduce((s, r) => s + (r.net_worked_minutes || 0), 0),
        },
        records: filtered,
      },
    });
  }

  // ── Notifications ─────────────────────────────────────────────────────
  @Get("/notifications")
  @Swagger("Notifications", "Get workforce notifications (late, excess break, device alerts)")
  async notifications(req: any, res: Response) {
    const repo   = dataSource.getRepository(AttendanceNotification);
    const where: any = TenantService.scopeWhere(req.user);
    if (req.query.is_read !== undefined) where.is_read = req.query.is_read === "true";

    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const [records, total] = await repo.findAndCount({
      where,
      order: { id: "DESC" },
      skip:  (page - 1) * limit,
      take:  limit,
    });

    return res.json({ success: true, data: records, total, page, limit });
  }

  // ── Mark Notification Read ────────────────────────────────────────────
  @Post("/notifications/:id/read")
  @Swagger("Mark Notification Read", "Mark a notification as read")
  async markRead(req: any, res: Response) {
    await notificationService.markRead(Number(req.params.id));
    return res.json({ success: true, message: "Notification marked as read" });
  }
}
