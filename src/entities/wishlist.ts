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

// One row per (user, product). The unique constraint guarantees a product
// can't be added to the same user's wishlist twice at the DB level.
@Entity("wishlist")
@Unique("UQ_wishlist_user_product", ["user_id", "product_id"])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id!: number;

  // Explicit `name` is required: the PascalCaseNamingStrategy would
  // otherwise rename these to `UserId`/`ProductId`, leaving the relation
  // join columns (`user_id`/`product_id`) as separate, never-populated
  // columns. Pinning the name collapses scalar + relation onto one column.
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
