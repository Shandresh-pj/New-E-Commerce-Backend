import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("customer_locations")
export class CustomerLocation {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  customer_id!: number;

  @Column()
  location_type!: string;
  // HOME
  // OFFICE
  // OTHER

  @Column()
  address!: string;

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
    default: true,
  })
  is_default!: boolean;
}