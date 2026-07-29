import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Product } from "./products";

export enum UnitCategory {
  WEIGHT = "WEIGHT",
  VOLUME = "VOLUME",
  COUNT = "COUNT",
  LENGTH = "LENGTH"
}

@Entity("unit_conversions")
export class ProductUnitConversion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  product_id!: number;

  @Column({ type: "enum", enum: UnitCategory, default: UnitCategory.COUNT })
  category!: UnitCategory;

  @Column({ type: "varchar", length: 50 })
  unit_name!: string;

  @Column({ type: "varchar", length: 20 })
  unit_symbol!: string;

  @Column({ type: "decimal", precision: 14, scale: 6, default: 1.0 })
  conversion_to_base!: number;

  @Column({ type: "boolean", default: true })
  is_sale_unit!: boolean;

  @Column({ type: "boolean", default: true })
  is_purchase_unit!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @ManyToOne(() => Product, (product) => product.unitConversions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;
}
