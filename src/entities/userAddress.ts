import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from "typeorm";
import { Register } from "./register";

@Entity("user_addresses")
export class UserAddress extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id" })
  userId!: number;

  @ManyToOne(() => Register)
  @JoinColumn({ name: "user_id" })
  user!: Register;

  @Column({ name: "label", type: "varchar", length: 20, default: "Home" })
  label!: string;

  @Column({ name: "name", type: "varchar", length: 100 })
  name!: string;

  @Column({ name: "phone", type: "varchar", length: 20 })
  phone!: string;

  @Column({ name: "line1", type: "varchar", length: 255 })
  line1!: string;

  @Column({ name: "line2", type: "varchar", length: 255, nullable: true })
  line2?: string;

  @Column({ name: "city", type: "varchar", length: 100 })
  city!: string;

  @Column({ name: "state_name", type: "varchar", length: 100 })
  state!: string;

  @Column({ name: "pincode", type: "varchar", length: 10 })
  pincode!: string;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}
