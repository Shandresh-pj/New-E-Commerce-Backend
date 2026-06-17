import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./products";


@Entity("categories")
export class Category {

  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(
    () => Product,
    (product) => product.category
  )
  products!: Product[];

  @Column({
    length: 150,
  })
  name!: string;

  @Column({
    nullable: true,
  })
  description!: string;

  @Column({
    nullable: true,
  })
  image!: string;

   @Column({
    type: "int",
    nullable: true,
  })
  parent_id!: number | null;

  @ManyToOne(
    () => Category,
    (category) => category.children,
    {
      nullable: true,
      onDelete: "SET NULL",
    }
  )
  @JoinColumn({
    name: "parent_id",
  })
  parent!: Category;

  @OneToMany(
    () => Category,
    (category) => category.parent
  )
  children!: Category[];

  @Column({
    default: true,
  })
  status!: boolean;

  // Status master reference (dropdown), see /Status/All
  @Column({ type: "int", nullable: true })
  StatusId!: number | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}