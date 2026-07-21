import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { UserSubscription } from "./user-subscription.entity";
import { Company } from "./company";
import { SubscriptionInvoice } from "./subscription-invoice.entity";

@Entity("billing_history")
export class BillingHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  subscription_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int", nullable: true })
  invoice_id!: number | null;

  @Column({ type: "varchar", length: 100 })
  billing_cycle!: string;

  @Column({ type: "timestamp" })
  cycle_start!: Date;

  @Column({ type: "timestamp" })
  cycle_end!: Date;

  @Column("decimal", { precision: 10, scale: 2 })
  amount_billed!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_payment_id!: string | null;

  @Column({ type: "enum", enum: ["successful", "failed", "refunded"] })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => UserSubscription)
  @JoinColumn({ name: "subscription_id" })
  subscription!: UserSubscription;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => SubscriptionInvoice)
  @JoinColumn({ name: "invoice_id" })
  invoice!: SubscriptionInvoice;
}
