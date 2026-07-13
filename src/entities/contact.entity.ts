import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BaseEntity, Index } from "typeorm";

export enum ContactStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CONVERTED = "CONVERTED"
}

@Entity("contacts")
@Index(["status"])
@Index(["email"])
@Index(["phone"])
@Index(["isDeleted"])
export class Contact extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_name" })
  companyName: string;

  @Column({ name: "business_name" })
  businessName: string;

  @Column({ name: "owner_name" })
  ownerName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  city: string;

  @Column({ name: "business_type" })
  businessType: string;

  @Column({ nullable: true })
  gst: string;

  @Column({ nullable: true })
  website: string;

  @Column({ name: "employee_count" })
  employeeCount: number;

  @Column({ name: "preferred_plan" })
  preferredPlan: string;

  @Column({ name: "billing_cycle" })
  billingCycle: string;

  @Column({ type: "text", nullable: true })
  message: string;

  @Column({
    type: "varchar",
    default: ContactStatus.PENDING
  })
  status: ContactStatus;

  @Column({ name: "email_verified", default: false })
  emailVerified: boolean;

  @Column({ name: "verification_token", nullable: true })
  verificationToken: string;

  @Column({ name: "verification_token_expires", type: "timestamp", nullable: true })
  verificationTokenExpires: Date | null;

  @Column({ name: "is_deleted", default: false })
  isDeleted: boolean;

  @Column({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
