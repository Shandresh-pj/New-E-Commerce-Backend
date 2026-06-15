import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";

import { Register } from "./register";

@Entity("password_resets")
export class PasswordReset {

  @PrimaryGeneratedColumn()
  id!: number;

  // ========================
  // RELATION TO USER TABLE
  // ========================
  @ManyToOne(
    () => Register,
    (user) => user.passwordResets,
    {
      onDelete: "CASCADE"
    }
  )
  @JoinColumn({ name: "user_id" })
  user!: Register;

  @Column()
  otp!: string;

  @Column({ default: false })
  verified!: boolean;

  @Column()
  reset_token!: string;

  @Column({ nullable: true })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}