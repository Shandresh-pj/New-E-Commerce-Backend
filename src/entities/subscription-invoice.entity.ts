import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { UserSubscription } from "./user-subscription.entity";
import { Company } from "./company";

@Entity("subscription_invoices")
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true, nullable: true })
  invoice_number!: string | null;

  @Column({ type: "int" })
  subscription_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  gst_amount!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discount_amount!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: "json", nullable: true })
  company_details!: any | null;

  @Column({ type: "json", nullable: true })
  customer_details!: any | null;

  @Column({ type: "json", nullable: true })
  plan_details!: any | null;

  @Column({ type: "json", nullable: true })
  coupon_applied!: any | null;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Column({ type: "enum", enum: ["paid", "pending", "failed", "refunded"], default: "pending" })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  razorpay_order_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  razorpay_payment_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  razorpay_signature!: string | null;

  @Column({ type: "text", nullable: true })
  invoice_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => UserSubscription, (sub) => sub.invoices)
  @JoinColumn({ name: "subscription_id" })
  subscription!: UserSubscription;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;
}
