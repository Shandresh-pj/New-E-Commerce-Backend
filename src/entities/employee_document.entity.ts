import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export enum DocumentType {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
  PASSPORT = "PASSPORT",
  DRIVING_LICENSE = "DRIVING_LICENSE",
  PHOTO = "PHOTO",
  CERTIFICATE = "CERTIFICATE"
}

export enum DocumentVerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

@Entity("employee_documents")
export class EmployeeDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  employee_id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Column({
    type: "enum",
    enum: DocumentType
  })
  document_type!: DocumentType;

  @Column({ type: "varchar", length: 100, nullable: true })
  document_number?: string;

  @Column({ type: "varchar", length: 500 })
  file_url!: string;

  @Column({
    type: "enum",
    enum: DocumentVerificationStatus,
    default: DocumentVerificationStatus.PENDING
  })
  verification_status!: DocumentVerificationStatus;

  @Column({ type: "text", nullable: true })
  rejection_reason?: string;

  @Column({ type: "int", nullable: true })
  verified_by?: number;

  @Column({ type: "timestamptz", nullable: true })
  verified_at?: Date;


  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
