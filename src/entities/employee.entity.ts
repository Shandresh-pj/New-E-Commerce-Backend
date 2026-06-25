import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Company } from "./company";
import { Branch } from "./branch";

@Entity("employees")
export class Employee {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

 @JoinColumn({
   name:"company_id"
 })
 company:Company;

  @Column()
 branch_id:number;

 @JoinColumn({
   name:"branch_id"
 })
 branch:Branch;

  @Column({
    unique: true,
  })
  employee_code!: string;

  @Column()
  name!: string;

  @Column({
    unique: true,
  })
  email!: string;

  @Column()
  mobile!: string;

  @Column({
    nullable: true,
  })
  address!: string;

  @Column()
  designation!: string;

  @Column()
  department!: string;

 @Column({
  type: "enum",
  enum: [
    "SHOP_KEEPER",
    "DELIVERY_BOY"
  ],
})
role!: string;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  salary!: number;

  @Column({
    default: 8,
  })
  working_hours!: number;

  @Column({
    nullable: true,
  })
  joining_date!: string;

  @Column({
    nullable: true,
  })
  profile_image!: string;

  @Column({
    default: true,
  })
  status!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}