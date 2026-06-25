import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Branch } from "./branch";
import { Employee } from "./employee.entity";
import { UserRole } from "./user";

@Entity("companies")
export class Company {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  owner_id: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ unique: true, nullable: true })
  gst_number: string;

   @OneToMany(
    ()=>Branch,
    branch=>branch.company
  )
  branches:Branch[];

  @OneToMany(
 ()=>UserRole,
 userRole=>userRole.company
)
userRoles:UserRole[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

