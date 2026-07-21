import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { TranslationKey } from "./translation_key.entity";

@Entity("translation_values")
export class TranslationValue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int", nullable: true })
  company_id?: number; // Null for global/system defaults, integer for company-specific overrides

  @Index()
  @Column({ type: "int" })
  key_id!: number;

  @Index()
  @Column({ type: "varchar", length: 10 })
  language_code!: string;

  @Column({ type: "text" })
  translation_text!: string;

  @Column({ type: "boolean", default: true })
  is_approved!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => TranslationKey, { onDelete: "CASCADE" })
  @JoinColumn({ name: "key_id" })
  translation_key!: TranslationKey;
}
