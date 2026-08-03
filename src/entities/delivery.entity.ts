import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("delivery_assignments")
export class DeliveryAssignment {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  order_id!: number;

  @Column()
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({ type: "varchar", length: 500 })
  pickup_address!: string;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: 40.7278000 })
  pickup_latitude!: number;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: -74.0260000 })
  pickup_longitude!: number;

  @Column({ type: "varchar", length: 500 })
  delivery_address!: string;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: 40.7030000 })
  delivery_latitude!: number;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: -73.9910000 })
  delivery_longitude!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  customer_name!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  customer_phone!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  agent_name!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  agent_phone!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  vehicle_no!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  vehicle_type!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  distance_remaining!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  eta!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  speed!: string | null;

  @Column({ type: "varchar", length: 50, default: "COD" })
  payment_type!: string;

  @Column({ type: "varchar", length: 50, default: "PENDING" })
  delivery_status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

@Entity("delivery_tracking")
export class DeliveryTracking {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  order_id!: number;

  @Column()
  delivery_boy_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column("decimal", { precision: 10, scale: 7 })
  latitude!: number;

  @Column("decimal", { precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  pickup_address!: string | null;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: 40.7278000 })
  pickup_latitude!: number | null;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: -74.0260000 })
  pickup_longitude!: number | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  delivery_address!: string | null;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: 40.7030000 })
  delivery_latitude!: number | null;

  @Column("decimal", { precision: 10, scale: 7, nullable: true, default: -73.9910000 })
  delivery_longitude!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  delivery_boy_name!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  delivery_boy_phone!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  customer_name!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  invoice_no!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  vehicle_no!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  vehicle_type!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  speed!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  eta!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  distance_remaining!: string | null;

  @Column({ type: "varchar", length: 50, default: "MOVING" })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}