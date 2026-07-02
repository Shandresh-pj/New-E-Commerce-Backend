import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { Role } from "./roles";
import { Permission } from "./menu";
import { User } from "./user";
import { StatusType } from "../utils/Role-Access";

// Scope levels (most specific wins at resolution time):
//   global   → company_id, branch_id, user_id all NULL
//   admin    → company_id set
//   branch   → company_id + branch_id set
//   employee → company_id + branch_id + user_id set
//
// Duplicate scope rows are prevented in the controller, not by a DB unique
// constraint: MySQL treats NULLs as always-distinct in unique indexes, and
// TypeORM re-syncs unique constraints over nullable columns on every boot.
@Entity("role_permissions")
@Index("IDX_rp_role", ["role_id"])
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
nullable:true
})
user_id:number;

@ManyToOne(() => User)
@JoinColumn({ name: "user_id" })
user:User;

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