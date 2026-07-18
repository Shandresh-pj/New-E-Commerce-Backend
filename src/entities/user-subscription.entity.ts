import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Company } from "./company";
import { SubscriptionPlan } from "./subscription-plan.entity";
import { SubscriptionInvoice } from "./subscription-invoice.entity";

@Entity("user_subscriptions")
export class UserSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  plan_id!: number;

  @Column({ type: "enum", enum: ["active", "trialing", "canceled", "past_due", "expired"], default: "trialing" })
  status!: string;

  @Column({ type: "enum", enum: ["monthly", "yearly"] })
  billing_cycle!: string;

  @Column({ type: "timestamp", nullable: true })
  start_date!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  end_date!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  trial_end!: Date | null;

  @Column({ type: "boolean", default: true })
  auto_renew!: boolean;

  @Column({ type: "timestamp", nullable: true })
  canceled_at!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  cancellation_reason!: string | null;

  @Column({ type: "timestamp", nullable: true })
  upgraded_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  downgraded_at!: Date | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_subscription_id!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_customer_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: "plan_id" })
  plan!: SubscriptionPlan;

  @OneToMany(() => SubscriptionInvoice, (invoice) => invoice.subscription)
  invoices!: SubscriptionInvoice[];
}
