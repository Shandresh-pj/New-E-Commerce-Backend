import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// ─── Shift Type Enum ───────────────────────────────────────────────────────
export enum ShiftType {
  FIXED      = "FIXED",
  FLEXIBLE   = "FLEXIBLE",
  ROTATIONAL = "ROTATIONAL",
  OVERNIGHT  = "OVERNIGHT",
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("shifts")
export class Shift {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  company_id!: number;

  @Index()
  @Column()
  branch_id!: number;

  @Column({ length: 100 })
  name!: string;   // e.g. "Morning Shift", "Night Shift"

  @Column({
    type: "enum",
    enum: ShiftType,
    default: ShiftType.FIXED,
  })
  type!: ShiftType;

  @Column({ length: 10 })
  start_time!: string;   // HH:mm  e.g. "09:00"

  @Column({ length: 10 })
  end_time!: string;     // HH:mm  e.g. "18:00"

  // ── Policy Thresholds ──────────────────────────────────────────────────
  @Column({ default: 15 })
  grace_period_minutes!: number;   // late arrival grace

  @Column({ default: 480 })
  min_work_minutes!: number;       // 8 hours = 480

  @Column({ default: 480 })
  overtime_threshold_minutes!: number;  // OT starts after this

  @Column({ default: 15 })
  late_threshold_minutes!: number;      // marks as LATE after N mins

  @Column({ default: 240 })
  half_day_threshold_minutes!: number;  // below this = HALF_DAY

  // ── Break Allowance ────────────────────────────────────────────────────
  @Column({ default: 60 })
  allowed_break_minutes!: number;

  // ── Weekend / Holiday ─────────────────────────────────────────────────
  @Column({ type: "json", nullable: true })
  weekend_days!: number[];  // [0=Sun, 6=Sat]

  // ── Active Flag ───────────────────────────────────────────────────────
  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT ASSIGNMENT ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("shift_assignments")
@Index(["employee_id", "is_active"])
export class ShiftAssignment {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  employee_id!: number;

  @Column()
  shift_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({ length: 20 })
  effective_from!: string;   // DD:MM:YYYY

  @Column({ nullable: true, length: 20 })
  effective_to!: string;     // DD:MM:YYYY — null means open-ended

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  assigned_by!: number;   // admin user ID

  @CreateDateColumn()
  created_at!: Date;
}
