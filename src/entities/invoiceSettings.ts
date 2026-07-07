import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  Index
} from "typeorm";

@Entity("invoice_settings")
export class InvoiceSettings extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  company_id!: number;

  @Column({ default: "INV" })
  prefix!: string;

  @Column({ default: "ABC" })
  company_code!: string;

  @Column({ default: 4 })
  sequence_length!: number;

  @Column({ default: "-" })
  separator!: string;

  @Column({ default: 1 })
  current_sequence!: number;

  @Column({ default: 1 })
  starting_number!: number;

  @Column({ default: true })
  include_year!: boolean;

  @Column({ default: true })
  include_month!: boolean;

  @Column({ default: false })
  include_date!: boolean;

  @Column({ default: "A1" })
  letter_pattern!: string;

  @Column({ default: true })
  reset_yearly!: boolean;

  @Column({ default: true })
  reset_monthly!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
