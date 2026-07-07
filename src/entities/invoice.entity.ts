import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("invoice_settings")
export class InvoiceSetting {
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

  @Column({ default: 0 })
  current_sequence!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}