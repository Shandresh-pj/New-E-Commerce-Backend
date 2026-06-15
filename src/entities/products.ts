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

import { Register } from "./register";
import { CouponProduct } from "./coupons";
import {  StockLog } from "./stock";
import { Order, OrderItem } from "./order";
import { BranchStock } from "./branch_stock";
import { LowStockAlert } from "./lowstock";
import { Category } from "./category";
import { ProductAttributeValueProduct } from "./productAttribute";

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
    type: "json",
    nullable: true,
  })
  images!: string[];

  @Column({
    nullable: true,
  })
  video!: string;

  @Column()
  registration_id!: number;

  @ManyToOne(
    () => Register,
    register => register.products,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "registration_id",
  })
  creator!: Register;

  @Column({
    type: "int",
    default: 0,
  })
  stock!: number;

  @Column({
    nullable: true,
  })
  category!: string;

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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}


@Entity("cart")
export class Cart {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  product_id!: number;

  @Column({
    default: 1,
  })
  quantity!: number;

  @ManyToOne(
    () => Register,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({
    name: "user_id",
  })
  user!: Register;

  @ManyToOne(
    () => Product,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({
    name: "product_id",
  })
  product!: Product;

  @Column()
  category_id!: number;

  @ManyToOne(
    () => Category,
    (category) => category.products,
    {
      onDelete: "SET NULL",
    }
  )
  @JoinColumn({
    name: "category_id",
  })
  category!: Category;

  @CreateDateColumn()
  created_at!: Date;
}