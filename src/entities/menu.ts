
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany
} from "typeorm";
import { Role } from "./roles";

export enum MenuType {
  DASHBOARD = "Dashboard",
  USERS = "Users",
  ORDERS = "Orders",
  PRODUCTS = "Products",
  BRANCHES = "Branches",
  COMPANIES = "Companies",
}

export enum PermissionType {
  READ = "READ",
  WRITE = "WRITE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  APPROVE = "APPROVE",
}

@Entity("menu")
export class Menu {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true
  })
  name: string;

  @Column({
    unique: true
  })
  path: string;

  @Column({
    nullable: true
  })
  icon: string;

  @Column({
    default: true
  })
  isActive: boolean;

    @OneToMany(
    () => Permission,
    permission => permission.menu
  )
  permissions: Permission[];
}

@Entity("permissions")
export class Permission {

  @PrimaryGeneratedColumn()
  id: number;

  // @Column()
  // menu: string;

  @Column({
    type: "enum",
    enum: PermissionType
  })
  action: PermissionType;

   @Column()
  menu_id: number;

  @ManyToOne(
    () => Menu,
    menu => menu.permissions,
    {
      onDelete: "CASCADE"
    }
  )
  @JoinColumn({
    name: "menu_id"
  })
  menu: Menu;
}



