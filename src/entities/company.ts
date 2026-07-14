import { Entity, Column, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Branch }   from "./branch";
import { UserRole } from "./user";

@Entity("companies")
export class Company {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "int" })
  owner_id!: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 50, unique: true, nullable: true })
  gst_number!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  razorpay_key_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  razorpay_key_secret!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────────────
  @OneToMany(() => Branch, (b) => b.company)
  branches!: Branch[];

  @OneToMany(() => UserRole, (ur) => ur.company)
  userRoles!: UserRole[];
}
