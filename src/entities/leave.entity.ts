import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";


@Entity("leave_requests")
export class LeaveRequest {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column()
  leave_type!: string;
  // CASUAL
  // SICK
  // EMERGENCY
  // EARNED

  @Column()
  from_date!: string;

  @Column()
  to_date!: string;

  @Column()
  total_days!: number;

  @Column("text")
  reason!: string;

  @Column({
    default: "PENDING",
  })
  status!: string;
  // PENDING
  // APPROVED
  // REJECTED

  @Column({
    nullable: true,
  })
  approved_by!: number;

  @Column({
    nullable: true,
  })
  approved_at!: string;

  @CreateDateColumn()
  created_at!: Date;
}

