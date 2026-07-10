import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from "typeorm";

@Entity("payments")
export class Payment {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  order_id!: number;

  @Column()
  user_id!: number;

  @Column()
  method!: string;

  @Column("decimal")
  amount!: number;

  @Column()
  status!: string;

  @Column({
    nullable: true
  })
  transaction_id!: string;

  @Column({
    nullable: true
  })
  gateway!: string;

  @Column({
    nullable: true,
    default: "NONE" // NONE, PARTIAL, FULL
  })
  refund_status!: string;

  @Column("json", {
    nullable: true
  })
  payment_metadata!: any;

  @Column({
    default: 0
  })
  retry_count!: number;

  @CreateDateColumn()
  created_at!: Date;
}