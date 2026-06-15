import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

import { Product } from "./products";

@Entity("branch_stocks")
export class BranchStock {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_name!: string;

  @Column()
  product_id!: number;

  @ManyToOne(() => Product, p => p.branchStocks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @CreateDateColumn({ })
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}