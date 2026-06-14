import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";

import { Register } from "./register";
import { Coupon } from "./coupons";

@Entity("products_table_1")
export class Product {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column("decimal")
  price!: number;

  @Column({ nullable: true })
  barcode!: string;

  @Column({ nullable: true })
  image!: string;

  @Column({ type: "json", nullable: true })
  images!: string[];

  @Column({ nullable: true })
  video!: string;

  @Column()
  registration_id!: number;

  @Column({
  type: "int",
  default: 0,
})
stock!: number;

  @ManyToOne(() => Register)
  @JoinColumn({ name: "registration_id" })
  creator!: Register;

   @ManyToMany(() => Coupon, coupon => coupon.products)
  coupons!: Coupon[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}


// @Entity("coupons")
// export class Coupon {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @Column()
//   code!: string;

//   @Column()
//   type!: "percent" | "flat";

//   @Column("decimal")
//   value!: number;

//   @Column({ default: true })
//   is_active!: boolean;

//   @ManyToMany(() => Product, product => product.coupons)
//   @JoinTable({
//     name: "coupon_products",
//     joinColumn: { name: "coupon_id" },
//     inverseJoinColumn: { name: "product_id" },
//   })
//   products!: Product[];
// }