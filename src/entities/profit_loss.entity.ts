import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("profit_loss")
export class ProfitLoss {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

  @Column({ nullable: true })
  branch_id!: number;

  @Column("date")
  record_date!: string;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  revenue!: number;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  expenses!: number;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  net_profit!: number;

  @Column({ default: "MANUAL" })
  entry_type!: string; // MANUAL or AUTO

  @Column({ type: "text", nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
