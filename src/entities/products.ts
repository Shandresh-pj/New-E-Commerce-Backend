import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { ProductAttributeValue } from "./productAttribute";
import { StockLog }    from "./stock";
import { BranchStock } from "./branch_stock";
import { LowStockAlert } from "./lowstock";
import { OrderItem }   from "./order";
import { CouponProduct } from "./coupons";
import { ProductAttributeValueProduct } from "./productAttribute";
import { ProductVariant } from "./productVariant";
import { ProductApproval } from "./productApproval";
import { User }        from "./user";
import { Category }    from "./category";
import { ProductType, ProductStatus, ProductApprovalStatus } from "../dto/products.dto";

@Entity("products_table_1")
export class Product {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  barcode!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  image!: string | null;

  @Column({ type: "simple-json", nullable: true })
  images!: string[] | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  video!: string | null;

  @Column({ type: "int" })
  registration_id!: number;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  category!: string | null;

  @Column({ type: "enum", enum: ProductType, default: ProductType.SINGLE })
  product_type!: ProductType;

  @Column({ type: "int", default: 0 })
  stock_in_hand!: number;

  @Column({ type: "enum", enum: ProductStatus, default: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @Column({ type: "enum", enum: ProductApprovalStatus, default: ProductApprovalStatus.PUBLISHED })
  approval_status!: ProductApprovalStatus;

  @Column({ type: "int", default: 5 })
  low_stock_threshold!: number;

  @Column({ type: "int", default: 2 })
  critical_stock_threshold!: number;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "registration_id" })
  creator!: User;

  @OneToMany(() => BranchStock,   (bs)   => bs.product)
  branchStocks!: BranchStock[];

  @OneToMany(() => StockLog,      (sl)   => sl.product)
  stockLogs!: StockLog[];

  @OneToMany(() => LowStockAlert, (la)   => la.product)
  lowStockAlerts!: LowStockAlert[];

  @OneToMany(() => OrderItem,     (oi)   => oi.product)
  orderItems!: OrderItem[];

  @OneToMany(() => CouponProduct, (cp)   => cp.product)
  couponProducts!: CouponProduct[];

  @OneToMany(() => ProductAttributeValueProduct, (link) => link.Product)
  attributeValueLinks!: ProductAttributeValueProduct[];

  @OneToMany(() => ProductVariant, (v)   => v.Product)
  variants!: ProductVariant[];

  @OneToMany(() => ProductApproval, (pa) => pa.product)
  approvals!: ProductApproval[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════════════════════════
import { Register } from "./register";

@Entity("cart")
export class Cart {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "int" })
  product_id!: number;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "int", nullable: true })
  category_id!: number | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Register, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: Register;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @ManyToOne(() => Category, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "category_id" })
  category!: Category | null;
}