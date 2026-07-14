import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Register } from "./register";
import { Product }  from "./products";
import { PaymentMethod, PaymentStatus } from "../dto/order.dto";

// ═══════════════════════════════════════════════════════════════════════════
// ORDER
// ═══════════════════════════════════════════════════════════════════════════
@Entity("orders_1")
@Unique("UQ_COMPANY_INVOICE", ["company_id", "invoice_no"])
export class Order {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "int", nullable: true })
  product_id!: number | null;

  @Column({ type: "varchar", length: 50 })
  status!: string;  // PENDING, CONFIRMED, FAILED

  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total!: number;

  @Column({ type: "enum", enum: PaymentMethod, default: PaymentMethod.CASH })
  payment_method!: PaymentMethod;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  payment_status!: PaymentStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  transaction_id!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  gateway!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  payment_gateway!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, unique: true })
  invoice_no!: string | null;

  @Column({ type: "int" })
  registration_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "text", nullable: true })
  qr_code!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Register, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "user_id" })
  user!: Register;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER ITEM
// ═══════════════════════════════════════════════════════════════════════════
@Entity("order_items")
export class OrderItem {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  order_id!: number;

  @Column({ type: "int" })
  product_id!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @Column({ type: "int" })
  quantity!: number;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @ManyToOne(() => Product, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "product_id" })
  product!: Product;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER TRACKING
// ═══════════════════════════════════════════════════════════════════════════
@Entity("order_tracking")
export class OrderTracking {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  order_id!: number;

  @Column({ type: "int" })
  customer_id!: number;

  @Column({ type: "int" })
  delivery_boy_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 500 })
  pickup_address!: string;

  @Column({ type: "varchar", length: 500 })
  delivery_address!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  estimated_arrival!: string | null;

  @Column({ type: "varchar", length: 50, default: "ASSIGNED" })
  status!: string;  // ASSIGNED | PICKED_UP | ON_THE_WAY | DELIVERED
}