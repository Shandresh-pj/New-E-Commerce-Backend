import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "./company";
import { UserRole } from "./user";

@Entity("branches")
export class Branch {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  location!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @ManyToOne(() => Company, (c) => c.branches, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @OneToMany(() => UserRole, (ur) => ur.branch)
  userRoles!: UserRole[];
}