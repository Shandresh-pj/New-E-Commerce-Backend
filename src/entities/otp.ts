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
  id!: number;

  // @ManyToOne(
  //   () => Register,
  //   register => register.otpVerifications,
  //   {
  //     onDelete: "CASCADE",
  //   }
  // )
  @JoinColumn({
    name: "registration_id",
  })
  registration!: Register;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  mobile!: string;

  @Column()
  otp!: number;

  @Column()
  expires_at!: Date;

  @Column({ default: 0 })
  is_used!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}