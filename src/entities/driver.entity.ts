import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user";
import { Company } from "./company";
import { Vehicle } from "./vehicle.entity";

export enum DriverStatus {
  AVAILABLE = "AVAILABLE",
  ON_TRIP = "ON_TRIP",
  OFFLINE = "OFFLINE",
  SUSPENDED = "SUSPENDED"
}

@Entity("drivers")
export class Driver {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int", nullable: true })
  vehicle_id!: number | null;

  @Column({ type: "varchar", length: 100 })
  full_name!: string;

  @Column({ type: "varchar", length: 20 })
  phone_number!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  license_number!: string;

  @Column({ type: "enum", enum: DriverStatus, default: DriverStatus.AVAILABLE })
  status!: DriverStatus;

  @Column({ type: "boolean", default: false })
  is_verified!: boolean;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 4.85 })
  rating!: number;

  @Column({ type: "int", default: 0 })
  total_trips_completed!: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 12.971600 })
  latitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 77.594600 })
  longitude!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  license_document_url!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  identity_proof_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: "vehicle_id" })
  vehicle!: Vehicle;
}
