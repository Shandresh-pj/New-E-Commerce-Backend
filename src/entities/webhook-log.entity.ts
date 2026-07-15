import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("webhook_logs")
export class WebhookLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100 })
  event_type!: string;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  event_id!: string | null; // e.g. Razorpay event ID to prevent duplicate processing

  @Column({ type: "json" })
  payload!: any;

  @Column({ type: "enum", enum: ["success", "failed", "ignored"], default: "success" })
  processed_status!: string;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
