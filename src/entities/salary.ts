import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("salary")
export class Salary {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column()
  month!: string;

  @Column()
  year!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  basic_salary!: number;

  @Column({
    default: 0,
  })
  present_days!: number;

  @Column({
    default: 0,
  })
  leave_days!: number;

  @Column({
    default: 0,
  })
  absent_days!: number;

  @Column({
    default: 0,
  })
  overtime_minutes!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  overtime_amount!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  deduction_amount!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  final_salary!: number;

  @Column({
    default: "PENDING",
  })
  payment_status!: string;
  // PENDING
  // PAID

  @CreateDateColumn()
  created_at!: Date;
}