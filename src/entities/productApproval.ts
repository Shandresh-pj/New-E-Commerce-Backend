import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./products";

export enum ApprovalStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  CANCELLED = "Cancelled",
  CHANGES_REQUESTED = "Changes Requested",
}

export enum ApprovalActionType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  STOCK_ADJUST = "STOCK_ADJUST",
}

@Entity("product_approvals")
export class ProductApproval {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  product_id!: number;

  @ManyToOne(() => Product, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ nullable: true })
  branch_id!: number;

  @Column({ nullable: true })
  company_id!: number;

  @Column()
  requested_by!: string;

  @Column()
  requested_by_id!: number;

  @CreateDateColumn()
  requested_date!: Date;

  @Column({ nullable: true })
  approved_by!: string;

  @Column({ type: "timestamp", nullable: true })
  approved_date!: Date;

  @Column({ nullable: true })
  rejected_by!: string;

  @Column({ type: "timestamp", nullable: true })
  rejected_date!: Date;

  @Column({ type: "text", nullable: true })
  approval_comment!: string;

  @Column({
    type: "enum",
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status!: ApprovalStatus;

  @Column({
    type: "enum",
    enum: ApprovalActionType,
  })
  action_type!: ApprovalActionType;

  @Column({ type: "simple-json", nullable: true })
  previous_values!: any;

  @Column({ type: "simple-json", nullable: true })
  new_values!: any;

  @Column({ type: "simple-json", nullable: true })
  audit_history!: any[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
