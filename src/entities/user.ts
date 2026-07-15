import { Entity, Column, Index } from "typeorm";
import { AbstractBaseEntity } from "./base/base.entity";
import { StatusType, UserType } from "../utils/Role-Access";
import { OneToMany } from "typeorm";

@Entity("users")
@Index(["mobilenumber"])
@Index(["isActive"])
@Index(["status"])
export class User extends AbstractBaseEntity {

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  mobilenumber!: string | null;

  @Column({
    type: "enum",
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  userType!: UserType;

  @Column({ type: "boolean", default: true })
  mustChangePassword!: boolean;

  @Column({ type: "boolean", default: false })
  emailVerified!: boolean;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isSuperAdmin!: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  verificationToken!: string | null;

  @Column({ type: "timestamp", nullable: true })
  verificationTokenExpires!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  image!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  background_image!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", default: "ACTIVE" })
  status!: StatusType;

  // ── Relations ────────────────────────────────────────────────────────
  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles!: UserRole[];
}

// ───────────────────────────────────────────────────────────────────────────
// UserRole — user ↔ role ↔ company ↔ branch mapping
// ───────────────────────────────────────────────────────────────────────────
import { ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { Role }    from "./roles";
import { Company } from "./company";
import { Branch }  from "./branch";

@Entity("user_roles")
@Index(["user_id"])
@Index(["role_id"])
@Index(["company_id"])
@Index(["branch_id"])
export class UserRole {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "int" })
  role_id!: number;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  @ManyToOne(() => User, (u) => u.userRoles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Role, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @ManyToOne(() => Company, (c) => c.userRoles, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "company_id" })
  company!: Company | null;

  @ManyToOne(() => Branch, (b) => b.userRoles, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "branch_id" })
  branch!: Branch | null;
}