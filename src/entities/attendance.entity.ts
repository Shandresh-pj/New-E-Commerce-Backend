import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("attendance")
export class Attendance {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({
    length: 20,
  })
  attendance_date!: string; // DD:MM:YYYY

  @Column({
    nullable: true,
    length: 10,
  })
  check_in!: string;

  @Column({
    nullable: true,
    length: 10,
  })
  check_out!: string;

  @Column({
    default: 0,
  })
  total_minutes!: number;

  @Column({
    default: 0,
  })
  break_minutes!: number;

  @Column({
    default: 0,
  })
  overtime_minutes!: number;

  @Column({
    default: 0,
  })
  payable_minutes!: number;

  @Column({
    default: "PRESENT",
  })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}


@Entity("attendance_break_logs")
export class AttendanceBreakLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  attendance_id!: number;

  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column()
  break_type!: string;

  @Column()
  start_time!: string;

  @Column({
    nullable: true,
  })
  end_time!: string;

  @Column({
    default: 0,
  })
  total_minutes!: number;
}