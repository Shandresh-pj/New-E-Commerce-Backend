import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Company } from "./company";
import { Branch } from "./branch";

export enum VehicleCategory {
  BIKE = "BIKE",
  AUTO = "AUTO",
  MINI_CAB = "MINI_CAB",
  HATCHBACK = "HATCHBACK",
  SEDAN = "SEDAN",
  SUV = "SUV",
  LUXURY = "LUXURY",
  EV = "EV",
  TEMPO_TRAVELLER = "TEMPO_TRAVELLER",
  TATA_ACE = "TATA_ACE",
  PICKUP = "PICKUP",
  MINI_TRUCK = "MINI_TRUCK",
  TRUCK_407 = "TRUCK_407",
  LCV = "LCV",
  HCV = "HCV",
  HEAVY_TRUCK = "HEAVY_TRUCK",
  TRAILER = "TRAILER",
  CARGO_VAN = "CARGO_VAN"
}

export enum VehicleStatus {
  AVAILABLE = "AVAILABLE",
  ON_TRIP = "ON_TRIP",
  MAINTENANCE = "MAINTENANCE",
  OFFLINE = "OFFLINE"
}

@Entity("vehicles")
export class Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  registration_number!: string;

  @Column({ type: "enum", enum: VehicleCategory, default: VehicleCategory.SEDAN })
  category!: VehicleCategory;

  @Column({ type: "varchar", length: 50, nullable: true })
  model!: string | null;

  @Column({ type: "int", default: 4 })
  passenger_capacity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 500.00 })
  payload_capacity_kg!: number;

  @Column({ type: "enum", enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status!: VehicleStatus;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "boolean", default: false })
  is_verified!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 12.971600 })
  latitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 77.594600 })
  longitude!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 85.00 })
  fuel_or_battery_level!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 15.00 })
  base_fare!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 12.00 })
  per_km_rate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 2.00 })
  per_minute_rate!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  rc_document_url!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  insurance_document_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: "branch_id" })
  branch!: Branch;
}
