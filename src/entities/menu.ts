import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum MenuType {
  DASHBOARD = "Dashboard",
  USERS     = "Users",
  ORDERS    = "Orders",
  PRODUCTS  = "Products",
  BRANCHES  = "Branches",
  COMPANIES = "Companies",
}

export enum PermissionType {
  READ    = "READ",
  WRITE   = "WRITE",
  UPDATE  = "UPDATE",
  DELETE  = "DELETE",
  APPROVE = "APPROVE",
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════════════════
@Entity("menus")
export class Menu {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  path!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  icon!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  // ── Relations ────────────────────────────────────────────────────────
  @OneToMany(() => Permission, (p) => p.menu)
  permissions!: Permission[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION
// ═══════════════════════════════════════════════════════════════════════════
@Entity("permissions")
export class Permission {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: PermissionType })
  action!: PermissionType;

  @Column({ type: "int" })
  menu_id!: number;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Menu, (m) => m.permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "menu_id" })
  menu!: Menu;
}
