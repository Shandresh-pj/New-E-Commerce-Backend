import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";

import { User } from "./user";
import { CouponProduct } from "./coupons";
import {  StockLog } from "./stock";
import { Order, OrderItem } from "./order";
import { BranchStock } from "./branch_stock";
import { LowStockAlert } from "./lowstock";
import { Category } from "./category";
import { ProductAttributeValueProduct } from "./productAttribute";
import { ProductVariant } from "./productVariant";
import { ProductType, ProductStatus } from "../dto/products.dto";
import { Register } from "./register";

@Entity("products_table_1")
export class Product {

  @PrimaryGeneratedColumn()
  id!: number;

@OneToMany(() => BranchStock, bs => bs.product)
branchStocks!: BranchStock[];

@OneToMany(() => StockLog, log => log.product)
stockLogs!: StockLog[];

@OneToMany(() => LowStockAlert, alert => alert.product)
lowStockAlerts!: LowStockAlert[];

@OneToMany(() => OrderItem, item => item.order)
orderItems!: OrderItem[];

  @Column()
  name!: string;

  @Column({
    type: "text",
    nullable: true,
  })
  description!: string;

  @Column("decimal", {
    precision: 10,
    scale: 2,
  })
  price!: number;

  @Column({
    nullable: true,
  })
  barcode!: string;

  @Column({
    nullable: true,
  })
  image!: string;
  
  @Column({
    type: "simple-json",
    nullable: true,
  })
  images!: string[];

  @Column({
    nullable: true,
  })
  video!: string;

  @Column()
  registration_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "registration_id",
  })
  creator!: User;

  @Column({
    type: "int",
    default: 0,
  })
  stock!: number;

  @Column({
    nullable: true,
  })
  category!: string;

  @Column({
    type: "enum",
    enum: ProductType,
    default: ProductType.SINGLE,
  })
  product_type!: ProductType;

  @Column({
    type: "int",
    default: 0,
  })
  stock_in_hand!: number;

  @Column({
    type: "enum",
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @OneToMany(
    () => CouponProduct,
    cp => cp.product
  )
  couponProducts!: CouponProduct[];

  @OneToMany(
    () => ProductAttributeValueProduct,
    link => link.Product
  )
  attributeValueLinks!: ProductAttributeValueProduct[];

  @OneToMany(
    () => ProductVariant,
    variant => variant.Product
  )
  variants!: ProductVariant[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}


@Entity("cart")
export class Cart {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  product_id: number;

  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => Register, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: Register;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ nullable: true })
  category_id: number;

  @ManyToOne(() => Category, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @CreateDateColumn()
  created_at: Date;
}