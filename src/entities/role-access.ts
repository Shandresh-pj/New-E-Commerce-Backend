import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { Role } from "./roles";
import { Permission } from "./menu";
import { StatusType } from "../utils/Role-Access";

@Entity("role_permissions")
@Unique(["role_id", "permission_id"])
export class RolePermission {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role_id: number;

  @Column()
  permission_id: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "role_id" })
  role: Role;

  @Column({
nullable:true
})
company_id:number;

@Column({
nullable:true
})
branch_id:number;

@Column({
default:false
})
canApprove:boolean;

  @ManyToOne(() => Permission, { eager: true })
  @JoinColumn({ name: "permission_id" })
  permission: Permission;

  @Column({type:"enum", enum:StatusType, default:StatusType.PENDING})
  status:StatusType;

  @CreateDateColumn()
  createdAt: Date;
}