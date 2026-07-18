import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Company } from "./company";
import { UserSubscription } from "./user-subscription.entity";

@Entity("payment_transactions")
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  subscription_id!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_order_id!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_payment_id!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  razorpay_signature!: string | null;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Column({ type: "enum", enum: ["created", "authorized", "captured", "refunded", "failed"] })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payment_method!: string | null; // e.g. card, netbanking, upi

  @Column({ type: "varchar", length: 255, nullable: true })
  error_code!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  error_description!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => UserSubscription)
  @JoinColumn({ name: "subscription_id" })
  subscription!: UserSubscription;
}
