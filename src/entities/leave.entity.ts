import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

export enum LeaveType {
  CASUAL    = "CASUAL",
  SICK      = "SICK",
  EMERGENCY = "EMERGENCY",
  EARNED    = "EARNED",
}

export enum LeaveStatus {
  PENDING  = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity("leave_requests")
export class LeaveRequest {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 50 })
  leave_type!: string;

  @Column({ type: "varchar", length: 20 })
  from_date!: string;

  @Column({ type: "varchar", length: 20 })
  to_date!: string;

  @Column({ type: "int" })
  total_days!: number;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  status!: string;

  @Column({ type: "int", nullable: true })
  approved_by!: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  approved_at!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}
