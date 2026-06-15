import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("break_settings")
export class BreakSetting {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({
    default: 60,
  })
  lunch_minutes!: number;

  @Column({
    default: 15,
  })
  tea_break_minutes!: number;

  @Column({
    default: 15,
  })
  evening_break_minutes!: number;

  @Column({
    default: true,
  })
  allow_overtime!: boolean;

  @Column({
    default: 480,
  })
  standard_work_minutes!: number;
}