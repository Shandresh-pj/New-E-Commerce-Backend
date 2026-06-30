import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from "typeorm";

@Entity("audit_logs")
export class AuditLog {

  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  module: string; // USER, ORDER, BRANCH, PRODUCT

  @Column()
  action: string; // CREATE, UPDATE, DELETE

  @Index()
  @Column()
  recordId: number;

  @Index()
  @Column()
  userId: number;

  @Column()
  roleId: number;

  @Index()
  @Column({ nullable: true })
  companyId: number;

  @Index()
  @Column({ nullable: true })
  branchId: number;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true, length: 512 })
  device: string;

  @Column({ type: "json", nullable: true })
  diff: any;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity("audit_logs_backup")
export class AuditLogBackup {

  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  module: string;

  @Column()
  action: string;

  @Column()
  recordId: number;

  @Column()
  userId: number;

  @Column()
  roleId: number;

  @Column({ nullable: true })
  companyId: number;

  @Column({ nullable: true })
  branchId: number;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true, length: 512 })
  device: string;

  @Column({ type: "json", nullable: true })
  diff: any;

  @CreateDateColumn()
  createdAt: Date;
}