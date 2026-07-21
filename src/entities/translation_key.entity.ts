import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("translation_keys")
export class TranslationKey {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 50, default: "common" })
  group_name!: string; // e.g., 'menu', 'auth', 'common', 'attendance', 'leave', 'payroll'

  @Index({ unique: true })
  @Column({ type: "varchar", length: 150 })
  key_name!: string; // e.g., 'menu.dashboard', 'auth.login_success'

  @Column({ type: "text" })
  default_text!: string; // English default string

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at!: Date;
}
