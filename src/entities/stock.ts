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

  @Column()
  product_id!: number; // keep for speed/filtering (optional but useful)

  @ManyToOne(() => Product, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" })
  product!: Product;

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

@Entity("low_stock_alerts")
export class LowStockAlert {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column()
  product_name!: string;

  @Column()
  current_stock!: number;

  @Column()
  threshold!: number;

  @CreateDateColumn()
  created_at!: Date;
}