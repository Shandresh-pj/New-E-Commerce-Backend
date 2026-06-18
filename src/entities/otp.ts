import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Register } from "./register";

@Entity("otp_verifications_1")
export class OtpVerification {

   @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true
  })
  email: string;

  @Column({
    nullable: true
  })
  mobile: string;

  @Column()
  otp: string;

  @Column()
  expires_at: Date;

  @Column({
    default: false
  })
  verified: boolean;

  @Column()
  registration_id: number;

  @ManyToOne(
    () => Register
  )
  @JoinColumn({
    name: "registration_id"
  })
  registration: Register;

  @Column()
is_used: number;

}