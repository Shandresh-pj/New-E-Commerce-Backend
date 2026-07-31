import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Company } from "./company";
import { User } from "./user";
import { Driver } from "./driver.entity";
import { VehicleCategory } from "./vehicle.entity";

export enum BookingType {
  RIDE = "RIDE",
  TAXI = "TAXI",
  RENTAL = "RENTAL",
  PARCEL = "PARCEL",
  CORPORATE = "CORPORATE",
  OUTSTATION = "OUTSTATION"
}

export enum BookingStatus {
  SEARCHING = "SEARCHING",
  ACCEPTED = "ACCEPTED",
  ARRIVED = "ARRIVED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

@Entity("mobility_bookings")
export class MobilityBooking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  booking_code!: string;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int", nullable: true })
  customer_id!: number | null;

  @Column({ type: "int", nullable: true })
  driver_id!: number | null;

  @Column({ type: "enum", enum: BookingType, default: BookingType.RIDE })
  booking_type!: BookingType;

  @Column({ type: "enum", enum: VehicleCategory, default: VehicleCategory.SEDAN })
  vehicle_category!: VehicleCategory;

  @Column({ type: "enum", enum: BookingStatus, default: BookingStatus.SEARCHING })
  status!: BookingStatus;

  @Column({ type: "varchar", length: 255 })
  pickup_address!: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  pickup_latitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  pickup_longitude!: number;

  @Column({ type: "varchar", length: 255 })
  drop_address!: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  drop_latitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  drop_longitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  distance_km!: number;

  @Column({ type: "int", default: 0 })
  estimated_duration_minutes!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  total_fare!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  base_fare!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  distance_fare!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  time_fare!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  tax_amount!: number;

  @Column({ type: "varchar", length: 10, nullable: true })
  otp!: string | null;

  @Column({ type: "varchar", length: 50, default: "CASH" })
  payment_method!: string;

  @Column({ type: "enum", enum: ["PENDING", "PAID", "REFUNDED"], default: "PENDING" })
  payment_status!: string;

  @Column({ type: "json", nullable: true })
  parcel_details!: any | null; // { weight_kg, package_type, receiver_name, receiver_phone }

  @Column({ type: "json", nullable: true })
  rental_details!: any | null; // { duration_hours, start_time, end_time, is_self_drive }

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => User)
  @JoinColumn({ name: "customer_id" })
  customer!: User;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: "driver_id" })
  driver!: Driver;
}
