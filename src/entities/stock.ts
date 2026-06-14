import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("stock_logs")
export class StockLog {

  @PrimaryGeneratedColumn()
  id!: number;

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