import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("notifications")
export class Notification {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  message!: string;

  @Column()
  type!: string; // 'LOW_STOCK' | 'CRITICAL_STOCK' | 'APPROVAL_REQUEST' | 'PUBLISHED' | 'STOCK_UPDATE' | 'BRANCH_ALERT'

  @Column({ nullable: true })
  product_id!: number;

  @Column({ nullable: true })
  branch_name!: string;

  @Column({ nullable: true })
  quantity!: number;

  @Column({ default: false })
  is_read!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
