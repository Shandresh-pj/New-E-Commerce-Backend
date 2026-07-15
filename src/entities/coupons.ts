import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Register } from "./register";
import { Product } from "./products";



@Entity("coupons_1")
export class Coupon {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string;

  @Column({
    type: "enum",
    enum: ["percent", "flat", "bogo", "free_shipping"],
    default: "flat"
  })
  type!: "percent" | "flat" | "bogo" | "free_shipping";

  @Column("decimal")
  value!: number;

  @Column({
    default: true,
  })
  is_active!: boolean;

  @Column()
  created_by!: number;

  @Column({
    type: "int",
    nullable: true,
  })
  buy_x!: number;

  @Column({
    type: "int",
    nullable: true,
  })
  get_y!: number;

  @Column({ type: "timestamp", nullable: true })
  expiry_date!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  start_date!: Date | null;

  @Column({ type: "int", nullable: true })
  usage_limit!: number | null;

  @Column({ type: "int", nullable: true })
  per_user_limit!: number | null;

  @Column({ default: 0 })
  usage_count!: number;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  // @ManyToOne(
  //   () => Register,
  //   register => register.coupons,
  //   {
  //     onDelete: "CASCADE",
  //   }
  // )
  @JoinColumn({
    name: "created_by",
  })
  creator!: Register;

  @OneToMany(
    () => CouponProduct,
    cp => cp.coupon
  )
  products!: CouponProduct[];
}

@Entity("coupon_products_1")
export class CouponProduct {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  coupon_id!: number;

  @Column()
  product_id!: number;

  @ManyToOne(
    () => Coupon,
    coupon => coupon.products,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "coupon_id",
  })
  coupon!: Coupon;

  @ManyToOne(
    () => Product,
    product => product.couponProducts,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "product_id",
  })
  product!: Product;
}