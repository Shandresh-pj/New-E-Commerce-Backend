import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Product } from "./products";

@Entity("stock_logs")
export class StockLog {

  @PrimaryGeneratedColumn()
  id!: number;

 @ManyToOne(() => Product, product => product.stockLogs, {
  onDelete: "CASCADE",
})
@JoinColumn({ name: "product_id" })
product!: Product;

@Column()
product_id!: number;

  @Column()
  old_stock!: number;

  @Column()
  added_stock!: number;

  @Column()
  new_stock!: number;

  @Column()
  action!: string; // ADD / REMOVE

  @Column()
  created_by!: number;

  @CreateDateColumn()
  created_at!: Date;
}

