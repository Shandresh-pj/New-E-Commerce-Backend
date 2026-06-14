import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Register } from "./register";
import { Product } from "./products";



@Entity("coupons_1")
export class Coupon {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string;

  @Column()
  type!: "percent" | "flat";

  @Column("decimal")
  value!: number;

  @Column({
    default: true,
  })
  is_active!: boolean;

  @Column()
  created_by!: number;

  @Column({
    nullable: true,
  })
  buy_x!: number;

  @Column({
    nullable: true,
  })
  get_y!: number;

  @ManyToOne(
    () => Register,
    register => register.coupons,
    {
      onDelete: "CASCADE",
    }
  )
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