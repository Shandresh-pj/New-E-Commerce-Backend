import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum ShiftType {
  FIXED      = "FIXED",
  FLEXIBLE   = "FLEXIBLE",
  ROTATIONAL = "ROTATIONAL",
  OVERNIGHT  = "OVERNIGHT",
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT
// ═══════════════════════════════════════════════════════════════════════════
@Entity("shifts")
export class Shift {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Index()
  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "enum", enum: ShiftType, default: ShiftType.FIXED })
  type!: ShiftType;

  @Column({ type: "varchar", length: 10 })
  start_time!: string;  // HH:mm

  @Column({ type: "varchar", length: 10 })
  end_time!: string;    // HH:mm

  @Column({ type: "int", default: 15 })
  grace_period_minutes!: number;

  @Column({ type: "int", default: 480 })
  min_work_minutes!: number;

  @Column({ type: "int", default: 480 })
  overtime_threshold_minutes!: number;

  @Column({ type: "int", default: 15 })
  late_threshold_minutes!: number;

  @Column({ type: "int", default: 240 })
  half_day_threshold_minutes!: number;

  @Column({ type: "int", default: 60 })
  allowed_break_minutes!: number;

  @Column({ type: "json", nullable: true })
  weekend_days!: number[] | null;  // [0=Sun, 6=Sat]

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════
@Entity("shift_assignments")
@Index(["employee_id", "is_active"])
export class ShiftAssignment {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Column({ type: "int" })
  shift_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 20 })
  effective_from!: string;  // DD:MM:YYYY

  @Column({ type: "varchar", length: 20, nullable: true })
  effective_to!: string | null;  // null = open-ended

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "int", nullable: true })
  assigned_by!: number | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}
