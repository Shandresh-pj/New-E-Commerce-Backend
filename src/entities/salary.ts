import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum PaymentMethod {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH          = "CASH",
  CHEQUE        = "CHEQUE",
  ONLINE        = "ONLINE",
}

export enum PayrollStatus {
  DRAFT    = "DRAFT",
  APPROVED = "APPROVED",
  PAID     = "PAID",
  REJECTED = "REJECTED",
}

@Entity("salary")
@Index(["employee_id", "month", "year"], { unique: true })
export class Salary {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 20 })
  month!: string;  // e.g. "July"

  @Column({ type: "int" })
  year!: number;

  // ── Base Salary ───────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2 })
  basic_salary!: number;

  // ── Attendance Summary ────────────────────────────────────────────────
  @Column({ type: "int", default: 0 })
  working_days!: number;

  @Column({ type: "int", default: 0 })
  present_days!: number;

  @Column({ type: "int", default: 0 })
  absent_days!: number;

  @Column({ type: "int", default: 0 })
  leave_days!: number;

  @Column({ type: "int", default: 0 })
  half_days!: number;

  @Column({ type: "int", default: 0 })
  late_days!: number;

  @Column({ type: "int", default: 0 })
  overtime_minutes!: number;

  // ── Allowances ────────────────────────────────────────────────────────
  @Column({ type: "json", nullable: true })
  allowances!: Record<string, number> | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_allowances!: number;

  // ── Gross / Deductions / Net ──────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  gross_salary!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  absent_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  half_day_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  break_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  late_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  tax_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  other_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_deductions!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  overtime_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  net_salary!: number;

  // ── Payment Info ─────────────────────────────────────────────────────
  @Column({ type: "enum", enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status!: PayrollStatus;

  @Column({ type: "enum", enum: PaymentMethod, nullable: true })
  payment_method!: PaymentMethod | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  payment_reference!: string | null;

  @Column({ type: "varchar", length: 25, nullable: true })
  payment_date!: string | null;

  // ── Approval ─────────────────────────────────────────────────────────
  @Column({ type: "int", nullable: true })
  approved_by!: number | null;

  @Column({ type: "varchar", length: 25, nullable: true })
  approved_at!: string | null;

  @Column({ type: "text", nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}