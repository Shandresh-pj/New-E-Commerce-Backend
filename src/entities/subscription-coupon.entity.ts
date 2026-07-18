import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("subscription_coupons")
export class SubscriptionCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  code!: string;

  @Column({ type: "enum", enum: ["percentage", "flat", "extra_days", "extra_months", "free_trial_extension", "renewal", "first_purchase", "referral", "buy_x_get_y"] })
  discount_type!: string;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  discount_value!: number | null;

  @Column({ type: "int", nullable: true })
  buy_x_months!: number | null;

  @Column({ type: "int", nullable: true })
  get_y_months!: number | null;

  @Column({ type: "int", nullable: true })
  free_trial_days!: number | null;

  @Column({ type: "timestamp", nullable: true })
  valid_from!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  valid_until!: Date | null;

  @Column({ type: "int", default: 0 })
  usage_limit!: number;

  @Column({ type: "int", default: 0 })
  used_count!: number;

  @Column({ type: "int", nullable: true })
  company_id_restriction!: number | null;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  min_order_value!: number | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
