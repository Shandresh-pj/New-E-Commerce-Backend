import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column()
  pickup_address!: string;

  @Column()
  delivery_address!: string;

  @Column()
  payment_type!: string;

  @Column({
    default: "PENDING",
  })
  delivery_status!: string;
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

  @Column("decimal", {
    precision: 10,
    scale: 7,
  })
  latitude!: number;

  @Column("decimal", {
    precision: 10,
    scale: 7,
  })
  longitude!: number;

  @Column({
    default: "MOVING",
  })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}