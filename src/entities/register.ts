import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { OtpVerification } from "./otp";
import { Order } from "./order";

export enum UserType {
  SUPER_ADMIN = "Super_Admin",
  ADMIN = "Admin",
  EMPLOYEES = "Employees",
  CUSTOMERS = "Customers",
}

export enum StatusType {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  SUSPENDED = "Suspended",
  PENDING = "Pending",
}

@Entity("registration_1")
export class Register extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: "id",
  })
  id!: number;

   @OneToMany(
    () => OtpVerification,
    otp => otp.registration
  )
  otpVerifications!: OtpVerification[];

  @OneToMany(() => Order, order => order.user)
  orders!: Order[];

  @Column({
    name: "name",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  name!: string;

  @Column({
    name: "email",
    type: "varchar",
    length: 100,
    unique: true,
    nullable: true,
  })
  email!: string;

  @Column({
    name: "password",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  password!: string;

  @Column({
    name: "image",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image?: string;

  @Column({
    name: "mobilenumber",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  mobilenumber?: string;

  @Column({
    name: "address",
    type: "text",
    nullable: true,
  })
  address?: string;

  @Column({
    name: "usertype",
    type: "enum",
    enum: UserType,
    default: UserType.CUSTOMERS,
  })
  usertype!: UserType;

  @Column({
    name: "logintype",
    type: "varchar",
    length: 50,
    default: "Normal",
  })
  logintype!: string;

  @Column({
    name: "status",
    type: "enum",
    enum: StatusType,
    default: StatusType.ACTIVE,
  })
  status!: StatusType;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
  })
  created_at!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
  })
  updated_at!: Date;
}