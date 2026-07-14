import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum AttendanceStatus {
  PRESENT        = "PRESENT",
  LATE           = "LATE",
  HALF_DAY       = "HALF_DAY",
  ABSENT         = "ABSENT",
  LEAVE          = "LEAVE",
  HOLIDAY        = "HOLIDAY",
  WEEKEND        = "WEEKEND",
  WORK_FROM_HOME = "WORK_FROM_HOME",
  OVERTIME       = "OVERTIME",
}

export enum AttendanceSource {
  MANUAL    = "MANUAL",
  BIOMETRIC = "BIOMETRIC",
  MOBILE    = "MOBILE",
  WEB       = "WEB",
  RFID      = "RFID",
  QR        = "QR",
}

export enum AuthType {
  FINGERPRINT = "FINGERPRINT",
  FACE        = "FACE",
  RFID        = "RFID",
  QR          = "QR",
  PIN         = "PIN",
  GPS         = "GPS",
}

export enum DeductionType {
  NONE             = "NONE",
  WARNING          = "WARNING",
  SALARY_DEDUCTION = "SALARY_DEDUCTION",
  HALF_DAY         = "HALF_DAY",
  HR_REVIEW        = "HR_REVIEW",
}

export enum BreakType {
  LUNCH    = "LUNCH",
  TEA      = "TEA",
  PERSONAL = "PERSONAL",
  FLEXIBLE = "FLEXIBLE",
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════
@Entity("attendance")
@Index(["employee_id", "attendance_date"], { unique: true })
export class Attendance {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Index()
  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "int", nullable: true })
  shift_id!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  shift_name!: string | null;

  @Index()
  @Column({ type: "varchar", length: 20 })
  attendance_date!: string;   // DD:MM:YYYY

  @Column({ type: "varchar", length: 10, nullable: true })
  check_in!: string | null;   // HH:mm:ss

  @Column({ type: "varchar", length: 10, nullable: true })
  check_out!: string | null;  // HH:mm:ss

  @Column({ type: "int", default: 0 })
  total_minutes!: number;

  @Column({ type: "int", default: 0 })
  break_minutes!: number;

  @Column({ type: "int", default: 0 })
  net_worked_minutes!: number;

  @Column({ type: "int", default: 0 })
  overtime_minutes!: number;

  @Column({ type: "int", default: 0 })
  payable_minutes!: number;

  @Column({ type: "enum", enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status!: AttendanceStatus;

  @Column({ type: "enum", enum: DeductionType, default: DeductionType.NONE })
  deduction_type!: DeductionType;

  @Column({ type: "int", default: 0 })
  deduction_minutes!: number;

  @Column({ type: "enum", enum: AttendanceSource, default: AttendanceSource.WEB })
  source!: AttendanceSource;

  @Column({ type: "int", nullable: true })
  device_id!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  device_serial!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  device_ip!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  device_location!: string | null;

  @Column({ type: "enum", enum: AuthType, nullable: true })
  auth_type!: AuthType | null;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  confidence_score!: number | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lat!: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lng!: number | null;

  @Column({ type: "boolean", default: false })
  is_regularized!: boolean;

  @Column({ type: "int", nullable: true })
  regularized_by!: number | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  regularized_at!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  regularization_note!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, unique: true })
  idempotency_key!: string | null;

  @Column({ type: "boolean", default: false })
  is_approved!: boolean;

  @Column({ type: "int", nullable: true })
  approved_by!: number | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  approved_at!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE BREAK LOG
// ═══════════════════════════════════════════════════════════════════════════
@Entity("attendance_break_logs")
export class AttendanceBreakLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  attendance_id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "int", nullable: true })
  break_policy_id!: number | null;

  @Column({ type: "enum", enum: BreakType, default: BreakType.PERSONAL })
  break_type!: BreakType;

  @Column({ type: "varchar", length: 10 })
  start_time!: string;   // HH:mm:ss

  @Column({ type: "varchar", length: 10, nullable: true })
  end_time!: string | null;   // HH:mm:ss

  @Column({ type: "int", default: 0 })
  total_minutes!: number;

  @Column({ type: "boolean", default: false })
  is_paid!: boolean;

  @Column({ type: "boolean", default: false })
  deduction_applied!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}