import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// ─── Attendance Status Enum ────────────────────────────────────────────────
export enum AttendanceStatus {
  PRESENT      = "PRESENT",
  LATE         = "LATE",
  HALF_DAY     = "HALF_DAY",
  ABSENT       = "ABSENT",
  LEAVE        = "LEAVE",
  HOLIDAY      = "HOLIDAY",
  WEEKEND      = "WEEKEND",
  WORK_FROM_HOME = "WORK_FROM_HOME",
  OVERTIME     = "OVERTIME",
}

// ─── Attendance Source Enum ────────────────────────────────────────────────
export enum AttendanceSource {
  MANUAL    = "MANUAL",
  BIOMETRIC = "BIOMETRIC",
  MOBILE    = "MOBILE",
  WEB       = "WEB",
  RFID      = "RFID",
  QR        = "QR",
}

// ─── Auth Type Enum ────────────────────────────────────────────────────────
export enum AuthType {
  FINGERPRINT  = "FINGERPRINT",
  FACE         = "FACE",
  RFID         = "RFID",
  QR           = "QR",
  PIN          = "PIN",
  GPS          = "GPS",
}

// ─── Deduction Type Enum ───────────────────────────────────────────────────
export enum DeductionType {
  NONE             = "NONE",
  WARNING          = "WARNING",
  SALARY_DEDUCTION = "SALARY_DEDUCTION",
  HALF_DAY         = "HALF_DAY",
  HR_REVIEW        = "HR_REVIEW",
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("attendance")
@Index(["employee_id", "attendance_date"], { unique: true })
export class Attendance {

  @PrimaryGeneratedColumn()
  id!: number;

  // ── Identifiers ──────────────────────────────────────────────────────────
  @Index()
  @Column()
  employee_id!: number;

  @Index()
  @Column()
  company_id!: number;

  @Index()
  @Column()
  branch_id!: number;

  // ── Shift Reference ───────────────────────────────────────────────────────
  @Column({ nullable: true })
  shift_id!: number;

  @Column({ nullable: true, length: 100 })
  shift_name!: string;

  // ── Date / Time ───────────────────────────────────────────────────────────
  @Index()
  @Column({ length: 20 })
  attendance_date!: string; // DD:MM:YYYY

  @Column({ nullable: true, length: 10 })
  check_in!: string;       // HH:mm:ss

  @Column({ nullable: true, length: 10 })
  check_out!: string;      // HH:mm:ss

  // ── Computed Time Fields ──────────────────────────────────────────────────
  @Column({ default: 0 })
  total_minutes!: number;        // check_out − check_in

  @Column({ default: 0 })
  break_minutes!: number;        // sum of all break sessions

  @Column({ default: 0 })
  net_worked_minutes!: number;   // total_minutes − break_minutes

  @Column({ default: 0 })
  overtime_minutes!: number;

  @Column({ default: 0 })
  payable_minutes!: number;

  // ── Status ────────────────────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status!: AttendanceStatus;

  // ── Break Deduction Logic ─────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: DeductionType,
    default: DeductionType.NONE,
  })
  deduction_type!: DeductionType;

  @Column({ default: 0 })
  deduction_minutes!: number;     // excess break minutes

  // ── Attendance Source & Device ────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: AttendanceSource,
    default: AttendanceSource.WEB,
  })
  source!: AttendanceSource;

  @Column({ nullable: true })
  device_id!: number;

  @Column({ nullable: true, length: 100 })
  device_serial!: string;

  @Column({ nullable: true, length: 45 })
  device_ip!: string;

  @Column({ nullable: true, length: 200 })
  device_location!: string;

  @Column({
    type: "enum",
    enum: AuthType,
    nullable: true,
  })
  auth_type!: AuthType;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  confidence_score!: number;      // biometric match score 0–100

  // ── Geo Tracking ─────────────────────────────────────────────────────────
  @Column({ nullable: true, length: 45 })
  ip_address!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lat!: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lng!: number;

  // ── Regularization (Admin Override) ──────────────────────────────────────
  @Column({ default: false })
  is_regularized!: boolean;

  @Column({ nullable: true })
  regularized_by!: number;

  @Column({ nullable: true, length: 20 })
  regularized_at!: string;

  @Column({ nullable: true, length: 500 })
  regularization_note!: string;

  // ── Idempotency ───────────────────────────────────────────────────────────
  @Column({ nullable: true, unique: true, length: 100 })
  idempotency_key!: string;

  // ── Approval ─────────────────────────────────────────────────────────────
  @Column({ default: false })
  is_approved!: boolean;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ nullable: true, length: 20 })
  approved_at!: string;

  // ── Timestamps ───────────────────────────────────────────────────────────
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE BREAK LOG ENTITY
// ═══════════════════════════════════════════════════════════════════════════
export enum BreakType {
  LUNCH    = "LUNCH",
  TEA      = "TEA",
  PERSONAL = "PERSONAL",
  FLEXIBLE = "FLEXIBLE",
}

@Entity("attendance_break_logs")
export class AttendanceBreakLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  attendance_id!: number;

  @Index()
  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({ nullable: true })
  break_policy_id!: number;

  @Column({
    type: "enum",
    enum: BreakType,
    default: BreakType.PERSONAL,
  })
  break_type!: BreakType;

  @Column({ length: 10 })
  start_time!: string;  // HH:mm:ss

  @Column({ nullable: true, length: 10 })
  end_time!: string;    // HH:mm:ss

  @Column({ default: 0 })
  total_minutes!: number;

  @Column({ default: false })
  is_paid!: boolean;

  @Column({ default: false })
  deduction_applied!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}