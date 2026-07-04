import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "./products";

@Entity("branch_transfers")
export class BranchTransfer {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  from_branch!: string;

  @Column()
  to_branch!: string;

  @Column()
  product_id!: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ default: "Pending Approval" })
  status!: string; // 'Pending Approval' | 'Approved' | 'Rejected' | 'Published'

  @Column({ type: "text", nullable: true })
  rejection_reason!: string;

  @Column()
  created_by!: number;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ type: "timestamp", nullable: true })
  approved_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
