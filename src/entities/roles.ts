import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany
} from "typeorm";
import { RolePermission } from "./role-access";

@Entity("roles")
export class Role {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => RolePermission, rp => rp.role)
  rolePermissions: RolePermission[];
}