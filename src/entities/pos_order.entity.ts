import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique
} from "typeorm";

@Entity("pos_orders")
@Unique("UQ_POS_COMPANY_INVOICE", ["company_id", "invoice_no"])
export class PosOrderEntity {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 100 })
  invoice_no!: string;

  @Index()
  @Column({ type: "int", default: 1 })
  company_id!: number;

  @Index()
  @Column({ type: "int", default: 1 })
  branch_id!: number;

  @Column({ type: "varchar", length: 200, nullable: true })
  company_name!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  branch_name!: string | null;

  @Column({ type: "varchar", length: 150, default: "Walk-in Customer" })
  customer_name!: string;

  @Column({ type: "varchar", length: 50, default: "N/A" })
  customer_phone!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  grand_total!: number;

  @Column({ type: "varchar", length: 50, default: "CASH" })
  payment_method!: string;

  @Column({ type: "varchar", length: 50, default: "COMPLETED" })
  payment_status!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  cash_tendered!: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  change_due!: number | null;

  @Column({ type: "json", nullable: true })
  items!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
