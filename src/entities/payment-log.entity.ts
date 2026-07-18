import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("payment_logs")
export class PaymentLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "varchar", length: 100 })
  action!: string; // e.g. "CREATE_ORDER", "VERIFY_PAYMENT", "REFUND"

  @Column({ type: "json" })
  request_data!: any;

  @Column({ type: "json", nullable: true })
  response_data!: any;

  @Column({ type: "boolean", default: true })
  success!: boolean;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
