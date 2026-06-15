import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";

import { Product } from "./products";

/**
 * Product Attribute (e.g. "Color", "Size")
 * Contract mirrors the reference backend so the Angular admin UI works unchanged:
 *   - PascalCase property names => PascalCase JSON keys (Id, AttributeNameCode, ...)
 *   - No translation tables: a single Name column is stored; the controller
 *     synthesizes the ProductAttributeTranslations array the UI expects.
 *   - CompanyId is optional (frontend does not send it) and defaults to 0.
 */
@Entity("product_attributes_1")
export class ProductAttribute {

  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ default: 0 })
  CompanyId!: number;

  @Column()
  AttributeNameCode!: string;

  @Column({ nullable: true })
  Name!: string;

  @OneToMany(
    () => ProductAttributeValue,
    value => value.ProductAttribute
  )
  Values!: ProductAttributeValue[];

  @CreateDateColumn()
  CreatedAt!: Date;

  @UpdateDateColumn()
  UpdatedAt!: Date;
}

/**
 * Product Attribute Value (e.g. "Red", "Blue" under "Color")
 */
@Entity("product_attribute_values_1")
export class ProductAttributeValue {

  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ default: 0 })
  CompanyId!: number;

  @Column()
  ProductAttributeId!: number;

  @Column()
  AttributeValueCode!: string;

  @Column({ nullable: true })
  Name!: string;

  @ManyToOne(
    () => ProductAttribute,
    attribute => attribute.Values,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductAttributeId",
  })
  ProductAttribute!: ProductAttribute;

  @OneToMany(
    () => ProductAttributeValueProduct,
    link => link.ProductAttributeValue
  )
  ProductLinks!: ProductAttributeValueProduct[];

  @CreateDateColumn()
  CreatedAt!: Date;

  @UpdateDateColumn()
  UpdatedAt!: Date;
}

/**
 * Junction: attribute value <-> product (many-to-many), like CouponProduct.
 */
@Entity("product_attribute_value_products_1")
export class ProductAttributeValueProduct {

  @PrimaryGeneratedColumn()
  Id!: number;

  @Column()
  ProductAttributeValueId!: number;

  @Column()
  ProductId!: number;

  @ManyToOne(
    () => ProductAttributeValue,
    value => value.ProductLinks,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductAttributeValueId",
  })
  ProductAttributeValue!: ProductAttributeValue;

  @ManyToOne(
    () => Product,
    product => product.attributeValueLinks,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({
    name: "ProductId",
  })
  Product!: Product;
}
