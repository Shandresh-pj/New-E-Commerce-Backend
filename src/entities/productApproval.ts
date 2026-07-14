import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./products";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum ApprovalStatus {
  PENDING           = "Pending",
  APPROVED          = "Approved",
  REJECTED          = "Rejected",
  CANCELLED         = "Cancelled",
  CHANGES_REQUESTED = "Changes Requested",
}

export enum ApprovalActionType {
  CREATE       = "CREATE",
  UPDATE       = "UPDATE",
  STOCK_ADJUST = "STOCK_ADJUST",
}

@Entity("product_approvals")
export class ProductApproval {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  product_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "varchar", length: 255 })
  requested_by!: string;

  @Column({ type: "int" })
  requested_by_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  approved_by!: string | null;

  @Column({ type: "timestamp", nullable: true })
  approved_date!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  rejected_by!: string | null;

  @Column({ type: "timestamp", nullable: true })
  rejected_date!: Date | null;

  @Column({ type: "text", nullable: true })
  approval_comment!: string | null;

  @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  status!: ApprovalStatus;

  @Column({ type: "enum", enum: ApprovalActionType })
  action_type!: ApprovalActionType;

  @Column({ type: "simple-json", nullable: true })
  previous_values!: any;

  @Column({ type: "simple-json", nullable: true })
  new_values!: any;

  @Column({ type: "simple-json", nullable: true })
  audit_history!: any[];

  @CreateDateColumn({ name: "requested_date" })
  requested_date!: Date;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Product, (p) => p.approvals, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "product_id" })
  product!: Product | null;
}
