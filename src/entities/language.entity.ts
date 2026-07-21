import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("languages")
export class Language {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 10 })
  code!: string; // e.g. 'en', 'ta', 'hi', 'te', 'ml', 'kn', 'ar'

  @Column({ type: "varchar", length: 100 })
  name!: string; // e.g. 'Tamil'

  @Column({ type: "varchar", length: 100 })
  native_name!: string; // e.g. 'தமிழ்'

  @Column({ type: "varchar", length: 50, default: "🌐" })
  flag_icon!: string;

  @Column({ type: "enum", enum: ["ltr", "rtl"], default: "ltr" })
  direction!: "ltr" | "rtl";

  @Column({ type: "boolean", default: false })
  is_default!: boolean;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
