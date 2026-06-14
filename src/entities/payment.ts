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

  @CreateDateColumn()
  created_at!: Date;
}