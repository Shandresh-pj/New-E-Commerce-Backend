import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Company } from "./company";
import { Vehicle } from "./vehicle.entity";

@Entity("fleet_assets")
export class FleetAsset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  vehicle_id!: number;

  @Column({ type: "varchar", length: 100 })
  asset_code!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  total_odometer_km!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 100.00 })
  battery_health_percentage!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0.00 })
  fuel_level_liters!: number;

  @Column({ type: "timestamp", nullable: true })
  last_service_date!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  next_service_due!: Date | null;

  @Column({ type: "enum", enum: ["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"], default: "EXCELLENT" })
  health_status!: string;

  @Column({ type: "json", nullable: true })
  telemetry_alerts!: any | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: "vehicle_id" })
  vehicle!: Vehicle;
}
