import { dataSource } from "../server";
import { Attendance, AttendanceStatus, AttendanceSource } from "../entities/attendance.entity";
import { BiometricDevice } from "../entities/biometric_device.entity";
import { Employee } from "../entities/employee.entity";
import { NotificationService } from "../services/notification.service";
import { NotificationType, NotificationSeverity } from "../entities/attendance_notification.entity";
import { BiometricService } from "../services/biometric.service";
import { nowDate } from "../utils/dateTime";
import moment from "moment";

const notificationService = new NotificationService();
const biometricService    = new BiometricService();

// ═══════════════════════════════════════════════════════════════════════════
// CRON TASK 1: Mark Absent Employees (runs at 23:59 daily)
// ═══════════════════════════════════════════════════════════════════════════
export const markAbsentees = async () => {
  if (!dataSource.isInitialized) return;

  console.log("[Cron] markAbsentees — started");

  try {
    const empRepo  = dataSource.getRepository(Employee);
    const attRepo  = dataSource.getRepository(Attendance);

    const today      = nowDate();
    const dayOfWeek  = moment().day(); // 0 = Sunday, 6 = Saturday

    // Skip weekends by default (TODO: check per-shift weekend_days config)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("[Cron] markAbsentees — skipped (weekend)");
      return;
    }

    // Get all active employees
    const employees = await empRepo.find({ where: { status: true } });

    // Get employees who already have attendance today
    const presentToday = await attRepo.find({ where: { attendance_date: today } });
    const presentIds   = new Set(presentToday.map((a) => a.employee_id));

    let absentCount = 0;

    for (const emp of employees) {
      if (presentIds.has(emp.id)) continue;

      // Create ABSENT record
      const absent = attRepo.create({
        employee_id:      emp.id,
        company_id:       emp.company_id,
        branch_id:        emp.branch_id,
        attendance_date:  today,
        status:           AttendanceStatus.ABSENT,
        source:           AttendanceSource.MANUAL,
        total_minutes:    0,
        net_worked_minutes: 0,
      });

      await attRepo.save(absent);
      absentCount++;
    }

    console.log(`[Cron] markAbsentees — marked ${absentCount} employees as ABSENT`);
  } catch (err) {
    console.error("[Cron] markAbsentees — error:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CRON TASK 2: Send Missing Checkout Alerts (runs at end-of-shift + 30min)
// ═══════════════════════════════════════════════════════════════════════════
export const sendMissingCheckoutAlerts = async () => {
  if (!dataSource.isInitialized) return;

  console.log("[Cron] sendMissingCheckoutAlerts — started");

  try {
    const repo  = dataSource.getRepository(Attendance);
    const today = nowDate();

    // Find employees checked in but not checked out
    const missing = await repo
      .createQueryBuilder("a")
      .where("a.attendance_date = :today", { today })
      .andWhere("a.check_in IS NOT NULL")
      .andWhere("a.check_out IS NULL")
      .andWhere("a.status NOT IN (:...skipStatus)", { skipStatus: [AttendanceStatus.ABSENT, AttendanceStatus.LEAVE] })
      .getMany();

    for (const record of missing) {
      await notificationService.sendAttendanceNotification({
        type:         NotificationType.MISSING_CHECKOUT,
        employee_id:  record.employee_id,
        company_id:   record.company_id,
        branch_id:    record.branch_id,
        severity:     NotificationSeverity.WARNING,
        attendance_id: record.id,
        extra: {
          checkIn: record.check_in,
          date:    record.attendance_date,
        },
      });
    }

    console.log(`[Cron] sendMissingCheckoutAlerts — sent ${missing.length} alerts`);
  } catch (err) {
    console.error("[Cron] sendMissingCheckoutAlerts — error:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CRON TASK 3: Check Device Online Status (runs every 5 minutes)
// ═══════════════════════════════════════════════════════════════════════════
export const checkDeviceHeartbeats = async () => {
  if (!dataSource.isInitialized) return;

  try {
    const repo    = dataSource.getRepository(BiometricDevice);
    const devices = await repo.find({ where: { is_online: true } });

    const threshold = moment().subtract(10, "minutes").toDate();  // 10-min timeout

    for (const device of devices) {
      if (device.last_ping_at && device.last_ping_at < threshold) {
        // Device hasn't pinged in 10 minutes — mark offline
        await biometricService.markDeviceOffline(device.id);
        console.log(`[Cron] checkDeviceHeartbeats — device ${device.device_serial} went offline`);
      }
    }
  } catch (err) {
    console.error("[Cron] checkDeviceHeartbeats — error:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CRON TASK 4: Overtime Alerts (runs every hour)
// ═══════════════════════════════════════════════════════════════════════════
export const sendOvertimeAlerts = async () => {
  if (!dataSource.isInitialized) return;

  try {
    const repo  = dataSource.getRepository(Attendance);
    const today = nowDate();

    // Find employees currently checked in with overtime
    const records = await repo.find({
      where: { attendance_date: today },
    });

    for (const record of records) {
      if (!record.check_in || record.check_out) continue;

      // Calculate live worked minutes
      const workedMinutes = moment().diff(moment(record.check_in, "HH:mm:ss"), "minutes");
      const threshold = 480 + 60;  // 8hr + 1hr buffer

      if (workedMinutes > threshold && record.overtime_minutes === 0) {
        await notificationService.sendAttendanceNotification({
          type:        NotificationType.OVERTIME,
          employee_id: record.employee_id,
          company_id:  record.company_id,
          branch_id:   record.branch_id,
          severity:    NotificationSeverity.INFO,
          attendance_id: record.id,
          extra: { overtimeMinutes: workedMinutes - 480 },
        });
      }
    }
  } catch (err) {
    console.error("[Cron] sendOvertimeAlerts — error:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULER INITIALIZER
// ═══════════════════════════════════════════════════════════════════════════
export const startAttendanceCron = () => {
  console.log("[Cron] Attendance cron scheduler initializing...");

  // Mark absentees at 23:55 daily
  const scheduleDaily = (hour: number, minute: number, task: () => Promise<void>, label: string) => {
    const now = moment();
    const target = moment().set({ hour, minute, second: 0, millisecond: 0 });
    if (now.isAfter(target)) target.add(1, "day");

    const msUntilFirst = target.diff(now);

    setTimeout(async () => {
      await task();
      setInterval(task, 24 * 60 * 60 * 1000);  // run every 24h
    }, msUntilFirst);

    console.log(`[Cron] Scheduled "${label}" at ${hour}:${minute < 10 ? "0" + minute : minute} — runs in ${Math.round(msUntilFirst / 60000)}min`);
  };

  // Daily absent marking at 23:55
  scheduleDaily(23, 55, markAbsentees, "markAbsentees");

  // Missing checkout alert at 19:30
  scheduleDaily(19, 30, sendMissingCheckoutAlerts, "sendMissingCheckoutAlerts");

  // Device heartbeat check every 5 minutes
  setInterval(checkDeviceHeartbeats, 5 * 60 * 1000);
  console.log("[Cron] Scheduled checkDeviceHeartbeats every 5 min");

  // Overtime alerts every hour
  setInterval(sendOvertimeAlerts, 60 * 60 * 1000);
  console.log("[Cron] Scheduled sendOvertimeAlerts every 60 min");

  console.log("[Cron] All attendance cron jobs scheduled");
};
