import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

// ─── Payment Method Enum ───────────────────────────────────────────────────
export enum PaymentMethod {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH          = "CASH",
  CHEQUE        = "CHEQUE",
  ONLINE        = "ONLINE",
}

// ─── Payroll Status Enum ───────────────────────────────────────────────────
export enum PayrollStatus {
  DRAFT    = "DRAFT",
  APPROVED = "APPROVED",
  PAID     = "PAID",
  REJECTED = "REJECTED",
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED SALARY / PAYROLL ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("salary")
@Index(["employee_id", "month", "year"], { unique: true })
export class Salary {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  employee_id!: number;

  @Index()
  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({ length: 20 })
  month!: string;   // e.g. "July"

  @Column()
  year!: number;

  // ── Base Salary ───────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2 })
  basic_salary!: number;

  // ── Attendance Summary ────────────────────────────────────────────────
  @Column({ default: 0 })
  working_days!: number;    // total working days in month

  @Column({ default: 0 })
  present_days!: number;

  @Column({ default: 0 })
  absent_days!: number;

  @Column({ default: 0 })
  leave_days!: number;

  @Column({ default: 0 })
  half_days!: number;

  @Column({ default: 0 })
  late_days!: number;

  @Column({ default: 0 })
  overtime_minutes!: number;

  // ── Allowances ────────────────────────────────────────────────────────
  // JSON: { hra: 0, transport: 0, special: 0, medical: 0 }
  @Column({ type: "json", nullable: true })
  allowances!: Record<string, number>;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_allowances!: number;

  // ── Gross Salary ──────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  gross_salary!: number;  // basic + allowances (before deductions)

  // ── Deductions ────────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  absent_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  half_day_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  break_deduction!: number;     // salary cut from excess breaks

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  late_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  tax_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  other_deduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_deductions!: number;

  // ── Overtime ─────────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  overtime_amount!: number;

  // ── Net Salary ────────────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  net_salary!: number;   // gross - deductions + overtime

  // ── Payment Info ─────────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status!: PayrollStatus;

  @Column({
    type: "enum",
    enum: PaymentMethod,
    nullable: true,
  })
  payment_method!: PaymentMethod;

  @Column({ nullable: true, length: 100 })
  payment_reference!: string;

  @Column({ nullable: true, length: 25 })
  payment_date!: string;

  // ── Approval ─────────────────────────────────────────────────────────
  @Column({ nullable: true })
  approved_by!: number;

  @Column({ nullable: true, length: 25 })
  approved_at!: string;

  @Column({ nullable: true, type: "text" })
  remarks!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}