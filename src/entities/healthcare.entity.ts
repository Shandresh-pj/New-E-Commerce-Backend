import { Entity, Column, Index } from "typeorm";
import { AbstractBaseEntity } from "./base/base.entity";

export enum AppointmentStatus {
  BOOKED          = "BOOKED",
  CONFIRMED       = "CONFIRMED",
  CHECKED_IN      = "CHECKED_IN",
  IN_CONSULTATION = "IN_CONSULTATION",
  COMPLETED       = "COMPLETED",
  CANCELLED       = "CANCELLED",
  NO_SHOW         = "NO_SHOW",
}

@Entity("hc_doctors")
@Index(["company_id"])
@Index(["branch_id"])
@Index(["is_active"])
export class Doctor extends AbstractBaseEntity {
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  specialization!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  license_no!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  qualification!: string | null;

  @Column({ type: "int", nullable: true })
  experience_years!: number | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  image!: string | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "int", nullable: true })
  user_id!: number | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

@Entity("hc_patients")
@Index(["company_id"])
@Index(["branch_id"])
export class Patient extends AbstractBaseEntity {
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "date", nullable: true })
  dob!: Date | null;

  @Column({ type: "enum", enum: ["Male", "Female", "Other"], nullable: true })
  gender!: "Male" | "Female" | "Other" | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  blood_group!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "text", nullable: true })
  allergies!: string | null;

  @Column({ type: "text", nullable: true })
  medical_history!: string | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

@Entity("hc_appointments")
@Index(["company_id"])
@Index(["branch_id"])
@Index(["status"])
@Index(["doctor_id"])
@Index(["patient_id"])
export class Appointment extends AbstractBaseEntity {
  @Column({ type: "int" })
  patient_id!: number;

  @Column({ type: "int" })
  doctor_id!: number;

  @Column({ type: "timestamp" })
  scheduled_at!: Date;

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status!: AppointmentStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  token_number!: string | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}
