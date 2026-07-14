import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("audit_logs")
export class AuditLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 100 })
  module!: string;  // USER, ORDER, BRANCH, PRODUCT, etc.

  @Column({ type: "varchar", length: 50 })
  action!: string;  // CREATE, UPDATE, DELETE

  @Index()
  @Column({ type: "int" })
  recordId!: number;

  @Index()
  @Column({ type: "int" })
  userId!: number;

  @Column({ type: "int" })
  roleId!: number;

  @Index()
  @Column({ type: "int", nullable: true })
  companyId!: number | null;

  @Index()
  @Column({ type: "int", nullable: true })
  branchId!: number | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  device!: string | null;

  @Column({ type: "json", nullable: true })
  diff!: Record<string, any> | null;

  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;
}

@Entity("audit_logs_backup")
export class AuditLogBackup {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 100 })
  module!: string;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ type: "int" })
  recordId!: number;

  @Column({ type: "int" })
  userId!: number;

  @Column({ type: "int" })
  roleId!: number;

  @Column({ type: "int", nullable: true })
  companyId!: number | null;

  @Column({ type: "int", nullable: true })
  branchId!: number | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  device!: string | null;

  @Column({ type: "json", nullable: true })
  diff!: Record<string, any> | null;

  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;
}