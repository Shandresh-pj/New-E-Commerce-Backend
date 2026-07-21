import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export enum HolidayType {
  MANDATORY = "MANDATORY",
  OPTIONAL = "OPTIONAL"
}

@Entity("company_calendar")
export class CompanyCalendar {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "varchar", length: 150 })
  holiday_name!: string;

  @Column({ type: "date" })
  holiday_date!: string;

  @Column({
    type: "enum",
    enum: HolidayType,
    default: HolidayType.MANDATORY
  })
  type!: HolidayType;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
