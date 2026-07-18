import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { PaymentTransaction } from "./payment-transaction.entity";
import { Company } from "./company";

@Entity("refunds")
export class Refund {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  transaction_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "varchar", length: 100 })
  razorpay_refund_id!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: "enum", enum: ["full", "partial"], default: "full" })
  refund_type!: string;

  @Column({ type: "enum", enum: ["pending", "processed", "failed"] })
  status!: string;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => PaymentTransaction)
  @JoinColumn({ name: "transaction_id" })
  transaction!: PaymentTransaction;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;
}
