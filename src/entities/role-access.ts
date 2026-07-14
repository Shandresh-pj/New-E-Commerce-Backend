import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Role }       from "./roles";
import { Permission } from "./menu";
import { User }       from "./user";
import { StatusType } from "../utils/Role-Access";

/**
 * RolePermission — scoped role-to-permission grant.
 *
 * Scope precedence (most specific wins):
 *   global   → company_id, branch_id, user_id all NULL
 *   admin    → company_id set
 *   branch   → company_id + branch_id set
 *   employee → company_id + branch_id + user_id set
 */
@Entity("role_permissions")
@Index("IDX_rp_role", ["role_id"])
export class RolePermission {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  role_id!: number;

  @Column({ type: "int" })
  permission_id!: number;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  @Column({ type: "int", nullable: true })
  user_id!: number | null;

  @Column({ type: "boolean", default: false })
  canApprove!: boolean;

  @Column({ type: "enum", enum: StatusType, default: StatusType.PENDING })
  status!: StatusType;

  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Role, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @ManyToOne(() => Permission, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "permission_id" })
  permission!: Permission;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: User | null;
}