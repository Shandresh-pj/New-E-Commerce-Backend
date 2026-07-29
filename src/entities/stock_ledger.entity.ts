import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Product } from "./products";
import { Branch }  from "./branch";
import { User }    from "./user";

export enum StockMovementType {
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  POS_SALE = "POS_SALE",
  RETURN = "RETURN",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  DAMAGE = "DAMAGE",
  PRODUCTION = "PRODUCTION",
  ADJUSTMENT = "ADJUSTMENT"
}

@Entity("stock_ledger")
export class StockLedger {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  @Index()
  product_id!: number;

  @Column({ type: "int", nullable: true })
  @Index()
  branch_id!: number | null;

  @Column({ type: "enum", enum: StockMovementType })
  movement_type!: StockMovementType;

  @Column({ type: "varchar", length: 50, default: "Piece" })
  unit_name!: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  quantity_change!: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  quantity_change_base!: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  balance_after_base!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  reference_id!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "int", nullable: true })
  created_by_user_id!: number | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @ManyToOne(() => Branch, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "branch_id" })
  branch!: Branch | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_user_id" })
  creator!: User | null;
}
