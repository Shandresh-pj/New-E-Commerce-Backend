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

@Entity("products_table_1")
export class Product {

  @PrimaryGeneratedColumn()
  id!: number;

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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}