import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// ─── Break Type ────────────────────────────────────────────────────────────
export enum PolicyBreakType {
  LUNCH    = "LUNCH",
  TEA      = "TEA",
  PERSONAL = "PERSONAL",
  FLEXIBLE = "FLEXIBLE",
}

// ═══════════════════════════════════════════════════════════════════════════
// BREAK POLICY ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("break_policies")
export class BreakPolicy {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  company_id!: number;

  @Index()
  @Column()
  branch_id!: number;

  @Column({ length: 100 })
  name!: string;   // e.g. "Standard Office Policy"

  @Column({
    type: "enum",
    enum: PolicyBreakType,
    default: PolicyBreakType.PERSONAL,
  })
  break_type!: PolicyBreakType;

  // ── Duration ──────────────────────────────────────────────────────────
  @Column({ default: 60 })
  max_duration_minutes!: number;   // total allowed break per day

  @Column({ default: 3 })
  max_frequency!: number;          // max number of break sessions

  @Column({ default: true })
  allow_split!: boolean;           // can break be split into sessions?

  @Column({ default: false })
  is_paid!: boolean;               // is break time paid?

  // ── Deduction Thresholds ──────────────────────────────────────────────
  // JSON: { warning: 15, salary_deduction: 30, half_day: 60, hr_review: 120 }
  @Column({ type: "simple-json" })
  deduction_rules!: {
    warning: number;           // minutes over limit → WARNING
    salary_deduction: number;  // minutes over limit → SALARY DEDUCTION
    half_day: number;          // minutes over limit → HALF DAY
    hr_review: number;         // minutes over limit → HR REVIEW
  };

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
