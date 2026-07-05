import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

// ─── Notification Type Enum ────────────────────────────────────────────────
export enum NotificationType {
  LATE_ARRIVAL       = "LATE_ARRIVAL",
  EXCESS_BREAK       = "EXCESS_BREAK",
  MISSING_CHECKOUT   = "MISSING_CHECKOUT",
  ATTENDANCE_ANOMALY = "ATTENDANCE_ANOMALY",
  OVERTIME           = "OVERTIME",
  DEVICE_OFFLINE     = "DEVICE_OFFLINE",
  BIOMETRIC_FAILED   = "BIOMETRIC_FAILED",
  LEAVE_DEDUCTED     = "LEAVE_DEDUCTED",
  HALF_DAY_MARKED    = "HALF_DAY_MARKED",
  HR_REVIEW_REQUIRED = "HR_REVIEW_REQUIRED",
}

// ─── Severity Enum ─────────────────────────────────────────────────────────
export enum NotificationSeverity {
  INFO     = "INFO",
  WARNING  = "WARNING",
  CRITICAL = "CRITICAL",
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE NOTIFICATION ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("attendance_notifications")
export class AttendanceNotification {

  @PrimaryGeneratedColumn()
  id!: number;

  // ── Target ────────────────────────────────────────────────────────────
  @Index()
  @Column({ nullable: true })
  employee_id!: number;   // null = broadcast to all managers

  @Index()
  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  // ── Notification Content ──────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: NotificationType,
  })
  notification_type!: NotificationType;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({
    type: "enum",
    enum: NotificationSeverity,
    default: NotificationSeverity.INFO,
  })
  severity!: NotificationSeverity;

  // ── Payload (structured data for UI) ─────────────────────────────────
  // JSON: { employeeName, employeeId, branch, eventType, timestamp, excessMinutes, ... }
  @Column({ type: "json", nullable: true })
  payload!: Record<string, any>;

  // ── Read Status ───────────────────────────────────────────────────────
  @Column({ default: false })
  is_read!: boolean;

  @Column({ nullable: true, length: 25 })
  read_at!: string;

  // ── Related Record ────────────────────────────────────────────────────
  @Column({ nullable: true })
  attendance_id!: number;

  @CreateDateColumn()
  created_at!: Date;
}
