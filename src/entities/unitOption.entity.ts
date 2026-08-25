import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { UnitCategory } from "./unit.entity";

@Entity("unit_options")
export class UnitOption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  symbol!: string;

  @Column({ type: "enum", enum: UnitCategory, default: UnitCategory.COUNT })
  category!: UnitCategory;

  @Column({ type: "boolean", default: true })
  status!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}
