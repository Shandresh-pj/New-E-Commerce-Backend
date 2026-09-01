import { Entity, Column, Index } from "typeorm";
import { AbstractBaseEntity } from "./base/base.entity";

export enum ConsultationStatus {
  OPEN      = "OPEN",
  COMPLETED = "COMPLETED",
}

export enum PrescriptionStatus {
  DRAFT     = "DRAFT",
  FINALIZED = "FINALIZED",
}

export enum MedicineSaleStatus {
  PENDING   = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum StockApprovalStatus {
  DRAFT     = "DRAFT",
  PENDING   = "PENDING",
  APPROVED  = "APPROVED",
  REJECTED  = "REJECTED",
}

// ─── Consultation ──────────────────────────────────────────────────────────────

@Entity("hc_consultations")
@Index(["company_id"])
@Index(["doctor_id"])
@Index(["patient_id"])
export class Consultation extends AbstractBaseEntity {
  @Column({ type: "int", nullable: true })
  appointment_id!: number | null;

  @Column({ type: "int" })
  patient_id!: number;

  @Column({ type: "int" })
  doctor_id!: number;

  @Column({ type: "text" })
  chief_complaint!: string;

  @Column({ type: "text", nullable: true })
  diagnosis!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "date", nullable: true })
  follow_up_date!: Date | null;

  @Column({
    type: "enum",
    enum: ConsultationStatus,
    default: ConsultationStatus.OPEN,
  })
  status!: ConsultationStatus;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

// ─── Prescription ──────────────────────────────────────────────────────────────

@Entity("hc_prescriptions")
@Index(["company_id"])
@Index(["doctor_id"])
@Index(["patient_id"])
export class Prescription extends AbstractBaseEntity {
  @Column({ type: "int", nullable: true })
  consultation_id!: number | null;

  @Column({ type: "int" })
  patient_id!: number;

  @Column({ type: "int" })
  doctor_id!: number;

  @Column({
    type: "enum",
    enum: PrescriptionStatus,
    default: PrescriptionStatus.DRAFT,
  })
  status!: PrescriptionStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

@Entity("hc_prescription_items")
@Index(["prescription_id"])
export class PrescriptionItem extends AbstractBaseEntity {
  @Column({ type: "int" })
  prescription_id!: number;

  @Column({ type: "int" })
  medicine_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  medicine_name!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  dosage!: string | null;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  duration!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  frequency!: string | null;

  @Column({ type: "boolean", default: false })
  morning!: boolean;

  @Column({ type: "boolean", default: false })
  afternoon!: boolean;

  @Column({ type: "boolean", default: false })
  evening!: boolean;

  @Column({ type: "boolean", default: false })
  night!: boolean;

  @Column({ type: "boolean", default: false })
  before_food!: boolean;

  @Column({ type: "text", nullable: true })
  instructions!: string | null;
}

// ─── Medicine Master ──────────────────────────────────────────────────────────

@Entity("hc_medicines")
@Index(["company_id"])
@Index(["branch_id"])
@Index(["is_active"])
export class Medicine extends AbstractBaseEntity {
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  generic_name!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  brand!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  composition!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  strength!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  dosage_form!: string | null;  // Tablet, Capsule, Syrup, etc.

  @Column({ type: "varchar", length: 255, nullable: true })
  manufacturer!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  unit!: string | null;  // Strip, Bottle, etc.

  @Column({ type: "varchar", length: 100, nullable: true })
  batch_no!: string | null;

  @Column({ type: "date", nullable: true })
  expiry_date!: Date | null;

  @Column({ type: "date", nullable: true })
  manufacture_date!: Date | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  prescription_control!: string | null;   // e.g. "OTC", "Prescription Only", "Schedule H", "Schedule X"

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  mrp!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  sale_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  purchase_price!: number;

  @Column({ type: "int", default: 0 })
  current_stock!: number;

  @Column({ type: "int", default: 10 })
  reorder_level!: number;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

// ─── Medicine Sale (Pharmacy POS) ─────────────────────────────────────────────

@Entity("hc_medicine_sales")
@Index(["company_id"])
@Index(["patient_id"])
export class MedicineSale extends AbstractBaseEntity {
  @Column({ type: "int", nullable: true })
  prescription_id!: number | null;

  @Column({ type: "int", nullable: true })
  patient_id!: number | null;

  @Column({ type: "int", nullable: true })
  sold_by!: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discount_amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  net_amount!: number;

  @Column({ type: "varchar", length: 50, default: "CASH" })
  payment_mode!: string;

  @Column({
    type: "enum",
    enum: MedicineSaleStatus,
    default: MedicineSaleStatus.COMPLETED,
  })
  status!: MedicineSaleStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}

@Entity("hc_medicine_sale_items")
@Index(["sale_id"])
export class MedicineSaleItem extends AbstractBaseEntity {
  @Column({ type: "int" })
  sale_id!: number;

  @Column({ type: "int" })
  medicine_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  medicine_name!: string | null;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  unit_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total_price!: number;
}

// ─── Healthcare Stock Approval ────────────────────────────────────────────────

@Entity("hc_stock_approvals")
@Index(["company_id"])
@Index(["branch_id"])
@Index(["status"])
export class HealthcareStockApproval extends AbstractBaseEntity {
  @Column({ type: "int" })
  medicine_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  medicine_name!: string | null;

  @Column({ type: "int", default: 0 })
  quantity!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  batch_no!: string | null;

  @Column({ type: "date", nullable: true })
  expiry_date!: Date | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  purchase_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  mrp!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  supplier!: string | null;

  @Column({
    type: "enum",
    enum: StockApprovalStatus,
    default: StockApprovalStatus.PENDING,
  })
  status!: StockApprovalStatus;

  @Column({ type: "int", nullable: true })
  requested_by!: number | null;

  @Column({ type: "int", nullable: true })
  approved_by!: number | null;

  @Column({ type: "text", nullable: true })
  reject_reason!: string | null;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;
}
