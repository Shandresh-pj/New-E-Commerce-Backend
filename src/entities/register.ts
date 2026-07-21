import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { StatusType, UserType } from "../utils/Role-Access";





@Entity("registration_1")
export class Register extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: "int", nullable: true })
  company_id!: number;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  mobilenumber!: string;

  @Column({ nullable: true })
  password!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ nullable: true })
  image!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  roleId!: number;

  @Column({ default: "ACTIVE" })
  status!: StatusType;

  @Column({ default: false })
  isSuperAdmin!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // @OneToMany(() => UserAccess, (ua) => ua.user)
  // access!: UserAccess[];
}


