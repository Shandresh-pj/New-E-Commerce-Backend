import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum DeviceType {
  FINGERPRINT = "FINGERPRINT",
  FACE        = "FACE",
  RFID        = "RFID",
  QR          = "QR",
  PIN         = "PIN",
  GPS         = "GPS",
  HYBRID      = "HYBRID",
}

export enum DeviceStatus {
  ACTIVE   = "ACTIVE",
  INACTIVE = "INACTIVE",
  OFFLINE  = "OFFLINE",
  BANNED   = "BANNED",
}

export enum BiometricAction {
  CHECK_IN    = "CHECK_IN",
  CHECK_OUT   = "CHECK_OUT",
  BREAK_START = "BREAK_START",
  BREAK_END   = "BREAK_END",
}

export enum BiometricAuthStatus {
  SUCCESS = "SUCCESS",
  FAILED  = "FAILED",
  SPOOFED = "SPOOFED",
  TIMEOUT = "TIMEOUT",
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC DEVICE
// ═══════════════════════════════════════════════════════════════════════════
import { UpdateDateColumn } from "typeorm";

@Entity("biometric_devices")
export class BiometricDevice {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  company_id!: number;

  @Index()
  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "varchar", length: 100 })
  device_name!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  device_serial!: string;

  @Column({ type: "enum", enum: DeviceType, default: DeviceType.FINGERPRINT })
  device_type!: DeviceType;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  location!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lat!: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lng!: number | null;

  @Column({ type: "boolean", default: false })
  is_whitelisted!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  jwt_secret!: string | null;

  @Column({ type: "enum", enum: DeviceStatus, default: DeviceStatus.INACTIVE })
  status!: DeviceStatus;

  @Column({ type: "boolean", default: false })
  is_online!: boolean;

  @Column({ type: "timestamp", nullable: true })
  last_ping_at!: Date | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  firmware_version!: string | null;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 80.0 })
  min_confidence_score!: number;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC AUTH LOG
// ═══════════════════════════════════════════════════════════════════════════
@Entity("biometric_auth_logs")
export class BiometricAuthLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  device_id!: number;

  @Index()
  @Column({ type: "int", nullable: true })
  employee_id!: number | null;

  @Column({ type: "int" })
  company_id!: number;

  @Column({ type: "int" })
  branch_id!: number;

  @Column({ type: "enum", enum: BiometricAction })
  action!: BiometricAction;

  @Column({ type: "enum", enum: BiometricAuthStatus, default: BiometricAuthStatus.FAILED })
  auth_status!: BiometricAuthStatus;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  confidence_score!: number | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  auth_type!: string | null;

  @Column({ type: "int", nullable: true })
  attendance_id!: number | null;

  @Column({ type: "text", nullable: true })
  failure_reason!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;
}
