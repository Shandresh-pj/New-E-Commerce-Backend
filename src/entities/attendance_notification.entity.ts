import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

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

export enum NotificationSeverity {
  INFO     = "INFO",
  WARNING  = "WARNING",
  CRITICAL = "CRITICAL",
}

@Entity("attendance_notifications")
export class AttendanceNotification {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int", nullable: true })
  employee_id!: number | null;  // null = broadcast to all managers

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "enum", enum: NotificationType })
  notification_type!: NotificationType;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "enum", enum: NotificationSeverity, default: NotificationSeverity.INFO })
  severity!: NotificationSeverity;

  @Column({ type: "json", nullable: true })
  payload!: Record<string, any> | null;

  @Column({ type: "boolean", default: false })
  is_read!: boolean;

  @Column({ type: "varchar", length: 25, nullable: true })
  read_at!: string | null;

  @Column({ type: "int", nullable: true })
  attendance_id!: number | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}
