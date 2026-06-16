import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Product } from "./products";
import { ProductAttribute, ProductAttributeValue } from "./productAttribute";

/**
 * Product Variant — a single attribute/value override (price, stock, barcode)
 * applied to a product. Mirrors the reference contract:
 *   { Id, CompanyId, ProductId, Barcode, Price, Stock, ProductAttributeId, ProductAttributeValueId }
 */
@Entity("product_variants_1")
export class ProductVariant {

  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ default: 0 })
  CompanyId!: number;

  @Column()
  ProductId!: number;

  @ManyToOne(
    () => Product,
    product => product.variants,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductId",
  })
  Product!: Product;

  @Column({ nullable: true })
  Barcode!: string;

  @Column("decimal", {
    precision: 10,
    scale: 2,
    default: 0,
  })
  Price!: number;

  @Column({
    type: "int",
    default: 0,
  })
  Stock!: number;

  @Column()
  ProductAttributeId!: number;

  @ManyToOne(
    () => ProductAttribute,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductAttributeId",
  })
  ProductAttribute!: ProductAttribute;

  @Column()
  ProductAttributeValueId!: number;

  @ManyToOne(
    () => ProductAttributeValue,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductAttributeValueId",
  })
  ProductAttributeValue!: ProductAttributeValue;

  @CreateDateColumn()
  CreatedAt!: Date;

  @UpdateDateColumn()
  UpdatedAt!: Date;
}
