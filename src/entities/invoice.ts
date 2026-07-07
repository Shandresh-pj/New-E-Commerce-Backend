import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  Index,
  Unique
} from "typeorm";

@Entity("invoices")
@Unique(["company_id", "invoice_number"])
@Index(["company_id"])
@Index(["invoice_number"])
@Index(["created_at"])
export class Invoice extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

  @Column()
  invoice_number!: string;

  @Column({ nullable: true })
  customer_id!: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  invoice_date!: Date;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  tax!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({ default: "PENDING" })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
