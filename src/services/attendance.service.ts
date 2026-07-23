import moment from "moment";
import { IsNull } from "typeorm";
import dataSource from "../config/database";
import {
  Attendance,
  AttendanceBreakLog,
  AttendanceStatus,
  AttendanceSource,
  DeductionType,
  BreakType,
} from "../entities/attendance.entity";
import { Shift } from "../entities/shift.entity";
import { ShiftAssignment } from "../entities/shift.entity";
import { BreakPolicy } from "../entities/break_policy.entity";
import { nowDate, nowTime } from "../utils/dateTime";
import { NotificationService } from "./notification.service";
import { NotificationType, NotificationSeverity } from "../entities/attendance_notification.entity";
import { io } from "../socket/socket";

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE BUSINESS LOGIC SERVICE
// ═══════════════════════════════════════════════════════════════════════════
export class AttendanceService {

  private notificationService = new NotificationService();

  // ─── Check-In ──────────────────────────────────────────────────────────
  async processCheckIn(payload: {
    employee_id: number;
    company_id: number;
    branch_id: number;
    source?: AttendanceSource;
    device_id?: number;
    device_serial?: string;
    device_ip?: string;
    device_location?: string;
    auth_type?: string;
    confidence_score?: number;
    ip_address?: string;
    gps_lat?: number;
    gps_lng?: number;
    idempotency_key?: string;
  }) {
    const repo = dataSource.getRepository(Attendance);
    const today = nowDate();

    // ── Idempotency: prevent double check-in ────────────────────────────
    const existing = await repo.findOne({
      where: {
        employee_id: payload.employee_id,
        attendance_date: today,
      },
    });

    if (existing) {
      throw new Error("Already checked in today. Duplicate check-in prevented.");
    }

    // ── Detect active shift ─────────────────────────────────────────────
    const shift = await this.getActiveShift(payload.employee_id, today);

    // ── Build record ────────────────────────────────────────────────────
    const checkInTime = nowTime();
    let status: AttendanceStatus = AttendanceStatus.PRESENT;

    if (shift) {
      const isLate = this.isLate(checkInTime, shift);
      if (isLate) status = AttendanceStatus.LATE;
    }

    const attendance = repo.create({
      employee_id:   payload.employee_id,
      company_id:    payload.company_id,
      branch_id:     payload.branch_id,
      shift_id:      shift?.id,
      shift_name:    shift?.name,
      attendance_date: today,
      check_in:      checkInTime,
      status,
      source:        payload.source ?? AttendanceSource.WEB,
      device_id:     payload.device_id,
      device_serial: payload.device_serial,
      device_ip:     payload.device_ip,
      device_location: payload.device_location,
      auth_type:     payload.auth_type as any,
      confidence_score: payload.confidence_score,
      ip_address:    payload.ip_address,
      gps_lat:       payload.gps_lat,
      gps_lng:       payload.gps_lng,
      idempotency_key: payload.idempotency_key,
      deduction_type: DeductionType.NONE,
    });

    await repo.save(attendance);

    // ── Notify managers if late ─────────────────────────────────────────
    if (status === AttendanceStatus.LATE && shift) {
      await this.notificationService.sendAttendanceNotification({
        type:        NotificationType.LATE_ARRIVAL,
        employee_id: payload.employee_id,
        company_id:  payload.company_id,
        branch_id:   payload.branch_id,
        severity:    NotificationSeverity.WARNING,
        attendance_id: attendance.id,
        extra: { shiftStart: shift.start_time, checkIn: checkInTime },
      });
    }

    // ── Emit Socket event ───────────────────────────────────────────────
    this.emitAttendanceEvent("attendance.checkin", {
      attendance_id: attendance.id,
      employee_id:   payload.employee_id,
      company_id:    payload.company_id,
      branch_id:     payload.branch_id,
      status,
      check_in:      checkInTime,
      date:          today,
    });

    // ── Emit live dashboard update ──────────────────────────────────────
    this.emitDashboardUpdate(payload.company_id, payload.branch_id);

    return attendance;
  }

  // ─── Check-Out ─────────────────────────────────────────────────────────
  async processCheckOut(attendanceId: number, payload: {
    ip_address?: string;
    gps_lat?: number;
    gps_lng?: number;
  }) {
    const repo      = dataSource.getRepository(Attendance);
    const breakRepo = dataSource.getRepository(AttendanceBreakLog);

    const attendance = await repo.findOne({ where: { id: attendanceId } });
    if (!attendance) throw new Error("Attendance session not found");
    if (attendance.check_out) throw new Error("Already checked out");

    const checkOutTime = nowTime();
    attendance.check_out = checkOutTime;

    // ── Compute total working time ──────────────────────────────────────
    const checkIn  = moment(attendance.check_in, "HH:mm:ss");
    const checkOut = moment(checkOutTime, "HH:mm:ss");
    let totalMinutes = checkOut.diff(checkIn, "minutes");
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    attendance.total_minutes = totalMinutes;

    // ── Compute total break time ────────────────────────────────────────
    const breaks = await breakRepo.find({ where: { attendance_id: attendanceId } });
    const breakMinutes = breaks.reduce((sum, b) => sum + (b.total_minutes || 0), 0);
    attendance.break_minutes = breakMinutes;

    // ── Net worked hours ────────────────────────────────────────────────
    attendance.net_worked_minutes = Math.max(0, totalMinutes - breakMinutes);

    // ── Overtime ────────────────────────────────────────────────────────
    const shift = attendance.shift_id
      ? await dataSource.getRepository(Shift).findOne({ where: { id: attendance.shift_id } })
      : null;

    const overtimeThreshold = shift?.overtime_threshold_minutes ?? 480;
    if (attendance.net_worked_minutes > overtimeThreshold) {
      attendance.overtime_minutes = attendance.net_worked_minutes - overtimeThreshold;
    }

    // ── Half-day check ──────────────────────────────────────────────────
    const halfDayThreshold = shift?.half_day_threshold_minutes ?? 240;
    if (
      attendance.net_worked_minutes <= halfDayThreshold &&
      attendance.status !== AttendanceStatus.LATE
    ) {
      attendance.status = AttendanceStatus.HALF_DAY;
    }

    // ── Apply break deduction rules ─────────────────────────────────────
    await this.applyBreakDeductionRules(attendance);

    await repo.save(attendance);

    // ── Emit socket event ───────────────────────────────────────────────
    this.emitAttendanceEvent("attendance.checkout", {
      attendance_id:      attendance.id,
      employee_id:        attendance.employee_id,
      company_id:         attendance.company_id,
      branch_id:          attendance.branch_id,
      check_out:          checkOutTime,
      net_worked_minutes: attendance.net_worked_minutes,
      overtime_minutes:   attendance.overtime_minutes,
      status:             attendance.status,
    });

    this.emitDashboardUpdate(attendance.company_id, attendance.branch_id);

    return attendance;
  }

  // ─── Break Start ───────────────────────────────────────────────────────
  async processBreakStart(attendanceId: number, breakType: BreakType, payload: {
    break_policy_id?: number;
  }) {
    const repo      = dataSource.getRepository(Attendance);
    const breakRepo = dataSource.getRepository(AttendanceBreakLog);

    const attendance = await repo.findOne({ where: { id: attendanceId } });
    if (!attendance) throw new Error("Attendance session not found");
    if (!attendance.check_in) throw new Error("Cannot start break — not checked in");
    if (attendance.check_out) throw new Error("Cannot start break — already checked out");

    // ── Prevent multiple active breaks ──────────────────────────────────
    const activeBreak = await breakRepo.findOne({
      where: { attendance_id: attendanceId, end_time: IsNull() },
    });
    if (activeBreak && !activeBreak.end_time) {
      throw new Error("An active break is already in progress");
    }

    // ── Enforce break frequency limit ───────────────────────────────────
    if (payload.break_policy_id) {
      const policy = await dataSource.getRepository(BreakPolicy).findOne({
        where: { id: payload.break_policy_id },
      });
      if (policy) {
        const breakCount = await breakRepo.count({ where: { attendance_id: attendanceId } });
        if (breakCount >= policy.max_frequency) {
          throw new Error(`Break limit reached. Max ${policy.max_frequency} breaks allowed per day.`);
        }
      }
    }

    const breakLog = breakRepo.create({
      attendance_id:   attendanceId,
      employee_id:     attendance.employee_id,
      company_id:      attendance.company_id,
      branch_id:       attendance.branch_id,
      break_policy_id: payload.break_policy_id,
      break_type:      breakType,
      start_time:      nowTime(),
      total_minutes:   0,
    });

    await breakRepo.save(breakLog);

    // ── Emit socket event ───────────────────────────────────────────────
    this.emitAttendanceEvent("attendance.break.start", {
      attendance_id: attendanceId,
      break_log_id:  breakLog.id,
      employee_id:   attendance.employee_id,
      company_id:    attendance.company_id,
      branch_id:     attendance.branch_id,
      break_type:    breakType,
      start_time:    breakLog.start_time,
    });

    this.emitDashboardUpdate(attendance.company_id, attendance.branch_id);

    return breakLog;
  }

  // ─── Break End ─────────────────────────────────────────────────────────
  async processBreakEnd(breakLogId: number) {
    const repo      = dataSource.getRepository(Attendance);
    const breakRepo = dataSource.getRepository(AttendanceBreakLog);

    const breakLog = await breakRepo.findOne({ where: { id: breakLogId } });
    if (!breakLog) throw new Error("Break log not found");
    if (breakLog.end_time) throw new Error("Break already ended");

    const endTime = nowTime();
    breakLog.end_time = endTime;

    // ── Compute break duration ──────────────────────────────────────────
    const start = moment(breakLog.start_time, "HH:mm:ss");
    const end   = moment(endTime, "HH:mm:ss");
    let breakMinutes = end.diff(start, "minutes");
    if (breakMinutes < 0) breakMinutes += 24 * 60;
    breakLog.total_minutes = breakMinutes;

    await breakRepo.save(breakLog);

    // ── Update parent attendance break_minutes ──────────────────────────
    const attendance = await repo.findOne({ where: { id: breakLog.attendance_id } });
    if (attendance) {
      const allBreaks = await breakRepo.find({ where: { attendance_id: attendance.id } });
      attendance.break_minutes = allBreaks.reduce((s, b) => s + (b.total_minutes || 0), 0);

      // ── Apply excess break deduction rules ──────────────────────────
      await this.applyBreakDeductionRules(attendance);
      await repo.save(attendance);
    }

    // ── Emit socket event ───────────────────────────────────────────────
    this.emitAttendanceEvent("attendance.break.end", {
      break_log_id:   breakLogId,
      attendance_id:  breakLog.attendance_id,
      employee_id:    breakLog.employee_id,
      company_id:     breakLog.company_id,
      branch_id:      breakLog.branch_id,
      total_minutes:  breakLog.total_minutes,
    });

    if (attendance) {
      this.emitDashboardUpdate(attendance.company_id, attendance.branch_id);
    }

    return { breakLog, attendance };
  }

  // ─── Apply Break Deduction Rules ───────────────────────────────────────
  async applyBreakDeductionRules(attendance: Attendance) {
    // Fetch break policy for this branch
    const policy = await dataSource.getRepository(BreakPolicy).findOne({
      where: {
        company_id: attendance.company_id,
        branch_id:  attendance.branch_id,
        is_active:  true,
      },
      order: { id: "DESC" },
    });

    const allowedBreak = policy?.max_duration_minutes ?? 60;
    const excessMinutes = Math.max(0, attendance.break_minutes - allowedBreak);

    attendance.deduction_minutes = excessMinutes;

    const rules = policy?.deduction_rules ?? {
      warning:          15,
      salary_deduction: 30,
      half_day:         60,
      hr_review:        120,
    };

    if (excessMinutes === 0) {
      attendance.deduction_type = DeductionType.NONE;
    } else if (excessMinutes <= rules.warning) {
      attendance.deduction_type = DeductionType.WARNING;
      // Send warning notification
      await this.notificationService.sendAttendanceNotification({
        type:        NotificationType.EXCESS_BREAK,
        employee_id: attendance.employee_id,
        company_id:  attendance.company_id,
        branch_id:   attendance.branch_id,
        severity:    NotificationSeverity.INFO,
        attendance_id: attendance.id,
        extra: { excessMinutes, rule: "WARNING" },
      });
    } else if (excessMinutes <= rules.salary_deduction) {
      attendance.deduction_type = DeductionType.SALARY_DEDUCTION;
      await this.notificationService.sendAttendanceNotification({
        type:        NotificationType.EXCESS_BREAK,
        employee_id: attendance.employee_id,
        company_id:  attendance.company_id,
        branch_id:   attendance.branch_id,
        severity:    NotificationSeverity.WARNING,
        attendance_id: attendance.id,
        extra: { excessMinutes, rule: "SALARY_DEDUCTION" },
      });
    } else if (excessMinutes <= rules.half_day) {
      attendance.deduction_type = DeductionType.HALF_DAY;
      attendance.status = AttendanceStatus.HALF_DAY;
      await this.notificationService.sendAttendanceNotification({
        type:        NotificationType.HALF_DAY_MARKED,
        employee_id: attendance.employee_id,
        company_id:  attendance.company_id,
        branch_id:   attendance.branch_id,
        severity:    NotificationSeverity.WARNING,
        attendance_id: attendance.id,
        extra: { excessMinutes, rule: "HALF_DAY" },
      });
    } else {
      attendance.deduction_type = DeductionType.HR_REVIEW;
      await this.notificationService.sendAttendanceNotification({
        type:        NotificationType.HR_REVIEW_REQUIRED,
        employee_id: attendance.employee_id,
        company_id:  attendance.company_id,
        branch_id:   attendance.branch_id,
        severity:    NotificationSeverity.CRITICAL,
        attendance_id: attendance.id,
        extra: { excessMinutes, rule: "HR_REVIEW" },
      });
    }

    // ── Emit status change ──────────────────────────────────────────────
    this.emitAttendanceEvent("attendance.status.changed", {
      attendance_id:  attendance.id,
      employee_id:    attendance.employee_id,
      status:         attendance.status,
      deduction_type: attendance.deduction_type,
      excess_minutes: excessMinutes,
    });
  }

  // ─── Helper: Get Active Shift ──────────────────────────────────────────
  async getActiveShift(employeeId: number, date: string): Promise<Shift | null> {
    const assignRepo = dataSource.getRepository(ShiftAssignment);
    const shiftRepo  = dataSource.getRepository(Shift);

    const assignment = await assignRepo.findOne({
      where: { employee_id: employeeId, is_active: true },
      order: { id: "DESC" },
    });

    if (!assignment) return null;

    return shiftRepo.findOne({ where: { id: assignment.shift_id, is_active: true } }) as Promise<Shift | null>;
  }

  // ─── Helper: Is Late ───────────────────────────────────────────────────
  isLate(checkInTime: string, shift: Shift): boolean {
    const shiftStart = moment(shift.start_time, "HH:mm");
    const graceEnd   = shiftStart.clone().add(shift.grace_period_minutes, "minutes");
    const actual     = moment(checkInTime, "HH:mm:ss");
    return actual.isAfter(graceEnd);
  }

  // ─── Helper: Emit Socket Event ─────────────────────────────────────────
  private emitAttendanceEvent(event: string, data: any) {
    try {
      if (io) {
        io.to(`company_${data.company_id}`).emit(event, data);
        if (data.branch_id) {
          io.to(`branch_${data.branch_id}`).emit(event, data);
        }
        if (data.employee_id) {
          io.to(`user_${data.employee_id}`).emit(event, data);
        }
      }
    } catch (e) {
      console.error("Socket emit failed:", e);
    }
  }

  // ─── Helper: Emit Dashboard Update ────────────────────────────────────
  private emitDashboardUpdate(companyId: number, branchId: number) {
    try {
      if (io) {
        io.to(`company_${companyId}`).emit("dashboard.metrics.update", {
          company_id: companyId,
          branch_id:  branchId,
          timestamp:  new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Dashboard socket emit failed:", e);
    }
  }

  // ─── Live Dashboard Metrics ────────────────────────────────────────────
  async getLiveDashboard(companyId?: number, branchId?: number) {
    const repo = dataSource.getRepository(Attendance);
    const today = nowDate();

    const where: any = { attendance_date: today };
    if (companyId) where.company_id = companyId;
    if (branchId) where.branch_id = branchId;

    const records = await repo.find({ where });

    const breakRepo = dataSource.getRepository(AttendanceBreakLog);

    const qb = breakRepo.createQueryBuilder("b").where("b.end_time IS NULL");
    if (companyId) {
      qb.andWhere("b.company_id = :companyId", { companyId });
    }
    const activeBreaks = await qb.getMany();

    const onBreakIds = new Set(activeBreaks.map((b) => b.employee_id));

    return {
      total:       records.length,
      present:     records.filter((r) => r.status === AttendanceStatus.PRESENT && !r.check_out).length,
      checked_out: records.filter((r) => !!r.check_out).length,
      on_break:    records.filter((r) => onBreakIds.has(r.employee_id) && !r.check_out).length,
      late:        records.filter((r) => r.status === AttendanceStatus.LATE).length,
      half_day:    records.filter((r) => r.status === AttendanceStatus.HALF_DAY).length,
      absent:      records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      overtime:    records.filter((r) => r.overtime_minutes > 0).length,
      date:        today,
    };
  }
}
