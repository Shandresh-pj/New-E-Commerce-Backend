import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./products";

@Entity("low_stock_alerts")
export class LowStockAlert {

  @PrimaryGeneratedColumn()
  id!: number;
  @ManyToOne(() => Product, product => product.lowStockAlerts, {
  onDelete: "CASCADE",
})
@JoinColumn({ name: "product_id" })
product!: Product;

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