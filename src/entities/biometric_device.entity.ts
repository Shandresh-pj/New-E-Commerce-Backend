import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// ─── Device Type Enum ──────────────────────────────────────────────────────
export enum DeviceType {
  FINGERPRINT = "FINGERPRINT",
  FACE        = "FACE",
  RFID        = "RFID",
  QR          = "QR",
  PIN         = "PIN",
  GPS         = "GPS",
  HYBRID      = "HYBRID",
}

// ─── Device Status Enum ────────────────────────────────────────────────────
export enum DeviceStatus {
  ACTIVE   = "ACTIVE",
  INACTIVE = "INACTIVE",
  OFFLINE  = "OFFLINE",
  BANNED   = "BANNED",
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC DEVICE ENTITY
// ═══════════════════════════════════════════════════════════════════════════
@Entity("biometric_devices")
export class BiometricDevice {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  company_id!: number;

  @Index()
  @Column()
  branch_id!: number;

  @Column({ length: 100 })
  device_name!: string;

  @Column({ unique: true, length: 100 })
  device_serial!: string;

  @Column({
    type: "enum",
    enum: DeviceType,
    default: DeviceType.FINGERPRINT,
  })
  device_type!: DeviceType;

  // ── Network Info ──────────────────────────────────────────────────────
  @Column({ nullable: true, length: 45 })
  ip_address!: string;

  @Column({ nullable: true, length: 200 })
  location!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lat!: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  gps_lng!: number;

  // ── Security ─────────────────────────────────────────────────────────
  @Column({ default: false })
  is_whitelisted!: boolean;

  @Column({ nullable: true, length: 500 })
  jwt_secret!: string;   // per-device JWT signing secret

  // ── Status ────────────────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: DeviceStatus,
    default: DeviceStatus.INACTIVE,
  })
  status!: DeviceStatus;

  @Column({ default: false })
  is_online!: boolean;

  @Column({ nullable: true, type: "timestamp" })
  last_ping_at!: Date;

  // ── Firmware / Config ─────────────────────────────────────────────────
  @Column({ nullable: true, length: 50 })
  firmware_version!: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 80.0 })
  min_confidence_score!: number;  // minimum score to accept auth

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC AUTH LOG ENTITY
// ═══════════════════════════════════════════════════════════════════════════
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

@Entity("biometric_auth_logs")
export class BiometricAuthLog {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  device_id!: number;

  @Index()
  @Column({ nullable: true })
  employee_id!: number;

  @Column()
  company_id!: number;

  @Column()
  branch_id!: number;

  @Column({
    type: "enum",
    enum: BiometricAction,
  })
  action!: BiometricAction;

  @Column({
    type: "enum",
    enum: BiometricAuthStatus,
    default: BiometricAuthStatus.FAILED,
  })
  auth_status!: BiometricAuthStatus;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  confidence_score!: number;

  @Column({ nullable: true, length: 45 })
  ip_address!: string;

  @Column({ nullable: true, length: 50 })
  auth_type!: string;

  @Column({ nullable: true })
  attendance_id!: number;

  @Column({ nullable: true, type: "text" })
  failure_reason!: string;

  @CreateDateColumn()
  created_at!: Date;
}
