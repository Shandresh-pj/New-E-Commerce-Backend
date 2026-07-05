import { dataSource } from "../server";
import {
  AttendanceNotification,
  NotificationType,
  NotificationSeverity,
} from "../entities/attendance_notification.entity";
import { Employee } from "../entities/employee.entity";
import { io } from "../socket/socket";
import { nowTime } from "../utils/dateTime";

interface NotificationPayload {
  type:         NotificationType;
  employee_id:  number;
  company_id:   number;
  branch_id:    number;
  severity:     NotificationSeverity;
  attendance_id?: number;
  extra?:       Record<string, any>;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, (emp: any, extra: any) => { title: string; message: string }> = {
  [NotificationType.LATE_ARRIVAL]: (emp, extra) => ({
    title:   `Late Arrival — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} checked in late. Shift started at ${extra?.shiftStart}, arrived at ${extra?.checkIn}.`,
  }),
  [NotificationType.EXCESS_BREAK]: (emp, extra) => ({
    title:   `Excess Break Alert — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} exceeded allowed break time by ${extra?.excessMinutes} minutes. Rule applied: ${extra?.rule}.`,
  }),
  [NotificationType.MISSING_CHECKOUT]: (emp, _extra) => ({
    title:   `Missing Checkout — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} has not checked out yet. HR review may be required.`,
  }),
  [NotificationType.ATTENDANCE_ANOMALY]: (emp, extra) => ({
    title:   `Attendance Anomaly — ${emp?.name ?? "Employee"}`,
    message: `Anomaly detected in attendance for ${emp?.name ?? "Employee"}: ${extra?.reason}`,
  }),
  [NotificationType.OVERTIME]: (emp, extra) => ({
    title:   `Overtime Alert — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} has exceeded working hours by ${extra?.overtimeMinutes} minutes.`,
  }),
  [NotificationType.DEVICE_OFFLINE]: (_emp, extra) => ({
    title:   `Device Offline — ${extra?.deviceName}`,
    message: `Biometric device "${extra?.deviceName}" at ${extra?.location} has gone offline.`,
  }),
  [NotificationType.BIOMETRIC_FAILED]: (emp, extra) => ({
    title:   `Biometric Auth Failed`,
    message: `Failed biometric authentication attempt on device ${extra?.deviceSerial} — Employee: ${emp?.name ?? "Unknown"}`,
  }),
  [NotificationType.LEAVE_DEDUCTED]: (emp, extra) => ({
    title:   `Leave Deducted — ${emp?.name ?? "Employee"}`,
    message: `A leave day has been automatically deducted for ${emp?.name ?? "Employee"} due to ${extra?.reason}.`,
  }),
  [NotificationType.HALF_DAY_MARKED]: (emp, extra) => ({
    title:   `Half Day Marked — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} has been marked as Half Day due to ${extra?.excessMinutes} minutes excess break.`,
  }),
  [NotificationType.HR_REVIEW_REQUIRED]: (emp, extra) => ({
    title:   `HR Review Required — ${emp?.name ?? "Employee"}`,
    message: `${emp?.name ?? "Employee"} exceeded break limit by ${extra?.excessMinutes} minutes. HR review is required.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════
export class NotificationService {

  async sendAttendanceNotification(payload: NotificationPayload): Promise<AttendanceNotification> {
    const repo = dataSource.getRepository(AttendanceNotification);
    const empRepo = dataSource.getRepository(Employee);

    // Fetch employee info for message templating
    const employee = payload.employee_id
      ? await empRepo.findOne({ where: { id: payload.employee_id } })
      : null;

    const template = NOTIFICATION_TEMPLATES[payload.type];
    const { title, message } = template(employee, payload.extra ?? {});

    const notification = repo.create({
      employee_id:       payload.employee_id,
      company_id:        payload.company_id,
      branch_id:         payload.branch_id,
      notification_type: payload.type,
      title,
      message,
      severity:          payload.severity,
      attendance_id:     payload.attendance_id,
      payload: {
        employeeName: employee?.name ?? "Unknown",
        employeeId:   payload.employee_id,
        branch:       payload.branch_id,
        eventType:    payload.type,
        timestamp:    new Date().toISOString(),
        ...payload.extra,
      },
    });

    await repo.save(notification);

    // ── Emit to socket ──────────────────────────────────────────────────
    try {
      if (io) {
        // Notify the employee
        io.to(`user_${payload.employee_id}`).emit("notification.created", notification);
        // Notify branch managers
        io.to(`branch_${payload.branch_id}`).emit("notification.created", notification);
        // Notify company admins
        io.to(`company_${payload.company_id}`).emit("notification.created", notification);
      }
    } catch (e) {
      console.error("Notification socket emit failed:", e);
    }

    return notification;
  }

  // ─── Device Offline Alert ──────────────────────────────────────────────
  async sendDeviceOfflineAlert(device: {
    id: number;
    company_id: number;
    branch_id: number;
    device_name: string;
    location?: string;
  }) {
    return this.sendAttendanceNotification({
      type:       NotificationType.DEVICE_OFFLINE,
      employee_id: 0,  // no specific employee
      company_id:  device.company_id,
      branch_id:   device.branch_id,
      severity:    NotificationSeverity.CRITICAL,
      extra: {
        deviceId:   device.id,
        deviceName: device.device_name,
        location:   device.location,
        timestamp:  new Date().toISOString(),
      },
    });
  }

  // ─── Get unread notifications for user ────────────────────────────────
  async getUnread(employeeId: number, companyId: number) {
    const repo = dataSource.getRepository(AttendanceNotification);
    return repo.find({
      where: { employee_id: employeeId, company_id: companyId, is_read: false },
      order: { id: "DESC" },
      take: 50,
    });
  }

  // ─── Mark notification as read ────────────────────────────────────────
  async markRead(notificationId: number) {
    const repo = dataSource.getRepository(AttendanceNotification);
    await repo.update(notificationId, {
      is_read: true,
      read_at: nowTime(),
    });
  }
}
