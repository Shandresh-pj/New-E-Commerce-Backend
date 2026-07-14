import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum NotificationEventType {
  LOW_STOCK       = "LOW_STOCK",
  CRITICAL_STOCK  = "CRITICAL_STOCK",
  APPROVAL_REQUEST = "APPROVAL_REQUEST",
  PUBLISHED       = "PUBLISHED",
  STOCK_UPDATE    = "STOCK_UPDATE",
  BRANCH_ALERT    = "BRANCH_ALERT",
}

@Entity("notifications")
export class Notification {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  message!: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  type!: string;

  // Optional FK columns — use undefined (not null) to satisfy TypeORM DeepPartial<T>
  @Column({ type: "int", nullable: true })
  product_id!: number | undefined;

  @Column({ type: "varchar", length: 255, nullable: true })
  branch_name!: string | undefined;

  @Column({ type: "int", nullable: true })
  quantity!: number | undefined;

  @Column({ type: "boolean", default: false })
  is_read!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}
