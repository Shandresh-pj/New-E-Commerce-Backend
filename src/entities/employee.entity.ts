import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";
import { Company }      from "./company";
import { Branch }       from "./branch";
import { EmployeeType } from "../utils/Role-Access";

@Entity("employees")
@Index(["company_id"])
@Index(["branch_id"])
export class Employee {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  employee_code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 20 })
  mobile!: string;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 100 })
  designation!: string;

  @Column({ type: "varchar", length: 100 })
  department!: string;

  @Column({ type: "enum", enum: EmployeeType })
  type!: EmployeeType;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  salary!: number;

  @Column({ type: "int", default: 8 })
  working_hours!: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  joining_date!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  profile_image!: string | null;

  @Column({ type: "boolean", default: true })
  status!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branch_id" })
  branch!: Branch;
}