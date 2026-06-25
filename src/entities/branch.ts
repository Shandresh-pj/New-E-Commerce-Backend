import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm";

import { Company } from "./company";
import { Employee } from "./employee.entity";
import { UserRole } from "./user";

@Entity("branches")
export class Branch {

  @PrimaryGeneratedColumn()
  id: number;


  @ManyToOne(()=>Company)
@JoinColumn({
name:"company_id"
})
company:Company;


@OneToMany(
 ()=>UserRole,
 userRole=>userRole.branch
)
userRoles:UserRole[];

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  email:string;


  @Column()
  phone:string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}