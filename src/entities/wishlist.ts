import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Register } from "./register";
import { Product } from "./products";

@Entity("wishlist")
@Unique("UQ_wishlist_user_product", ["user_id", "product_id"])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id" })
  user_id!: number;

  @Column({ name: "product_id" })
  product_id!: number;

  @ManyToOne(() => Register, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: Register;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @CreateDateColumn()
  created_at!: Date;
}
