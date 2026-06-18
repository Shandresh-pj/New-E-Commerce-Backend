import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from "typeorm";
import { User } from "./user";


@Entity("password_resets")
export class PasswordReset {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({
    name: "user_id"
  })
  user!: User;

  @Column()
  otp!: string;

  @Column()
  expires_at!: Date;


@Column({
  default: 0
})
attempts: number;

  @Column({
    default: false
  })
  verified!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}

