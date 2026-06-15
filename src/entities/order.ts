import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from "typeorm";

import { Register } from "./register";
import { PaymentMethod, PaymentStatus } from "../dto/order.dto";

@Entity("orders_1")
export class Order {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @ManyToOne(() => Register, user => user.orders, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "user_id" })
  user!: Register;

@ManyToOne(() => Order, order => order.product_id)
@JoinColumn({ name: "product_id" })
order!: Order;

@Column()
product_id!: number;

  @Column()
  status!: string; // PENDING, CONFIRMED, FAILED

  // ================= MONEY FIELDS =================
  @Column("decimal", { precision: 10, scale: 2 })
  subtotal!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  discount!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  total!: number;

  // ================= PAYMENT =================
  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.CASH
  })
  payment_method!: PaymentMethod;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  payment_status!: PaymentStatus;

  @Column({ nullable: true })
  transaction_id?: string;

  @Column({ nullable: true })
  gateway?: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({
  nullable: true
})
payment_gateway!: string;

  @OneToMany(() => OrderItem, item => item.order)
  items!: OrderItem[];

  @Column({ nullable: true, unique: true })
invoice_no!: string;

  @Column()
registration_id!: number;

 @Column()
company_id!: number;


@Column({ nullable: true })
qr_code!: string;
}



@Entity("order_items")
export class OrderItem {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  order_id!: number;

  @ManyToOne(() => Order, order => order.items, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column()
  product_id!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  price!: number;

  @Column()
  quantity!: number;
}

@Entity("order_tracking")
export class OrderTracking {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  order_id!: number;

  @Column()
  customer_id!: number;

  @Column()
  delivery_boy_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column()
  pickup_address!: string;

  @Column()
  delivery_address!: string;

  @Column({
    nullable: true,
  })
  estimated_arrival!: string;

  @Column({
    default: "ASSIGNED",
  })
  status!: string;
  // ASSIGNED
  // PICKED_UP
  // ON_THE_WAY
  // DELIVERED
}