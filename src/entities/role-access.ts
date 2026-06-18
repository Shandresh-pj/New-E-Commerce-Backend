import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from "typeorm";

import { Role } from "./roles";
import { Permission } from "./menu";

@Entity("role_permissions")
@Unique(["role_id", "permission_id"])
export class RolePermission {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role_id: number;

  @Column()
  permission_id: number;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @ManyToOne(() => Permission, { eager: true })
  @JoinColumn({ name: "permission_id" })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;
}