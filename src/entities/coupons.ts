import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Register } from "./register";



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

  @Column({ default: true })
  is_active!: boolean;

  // 👇 NEW RELATION TO USER
  @Column()
  created_by!: number;

  @Column({
  nullable: true
})
buy_x!: number;

@Column({
  nullable: true
})
get_y!: number;

  @ManyToOne(() => Register)
  @JoinColumn({ name: "created_by" })
  creator!: Register;
  

  @OneToMany(() => CouponProduct, cp => cp.coupon)
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

  @ManyToOne(() => Coupon, c => c.products, { onDelete: "CASCADE" })
  @JoinColumn({ name: "coupon_id" })
  coupon!: Coupon;
}