import jwt from "jsonwebtoken";
import crypto from "crypto";
import dataSource from "../config/database";
import {
  BiometricDevice,
  BiometricAuthLog,
  BiometricAction,
  BiometricAuthStatus,
  DeviceStatus,
} from "../entities/biometric_device.entity";
import { Attendance, AttendanceSource, AuthType } from "../entities/attendance.entity";
import { NotificationService } from "./notification.service";
import { NotificationType, NotificationSeverity } from "../entities/attendance_notification.entity";

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRIC SERVICE
// ═══════════════════════════════════════════════════════════════════════════
export class BiometricService {

  private notificationService = new NotificationService();

  // ─── Validate Incoming Device Request ─────────────────────────────────
  async validateDevice(deviceSerial: string, deviceIp?: string): Promise<BiometricDevice> {
    const repo = dataSource.getRepository(BiometricDevice);

    const device = await repo.findOne({ where: { device_serial: deviceSerial } });

    if (!device) {
      throw new Error(`Device not registered: ${deviceSerial}`);
    }

    if (!device.is_whitelisted) {
      throw new Error(`Device not whitelisted: ${deviceSerial}. Contact system administrator.`);
    }

    if (device.status === DeviceStatus.BANNED) {
      throw new Error(`Device is banned: ${deviceSerial}`);
    }

    if (device.status === DeviceStatus.INACTIVE) {
      throw new Error(`Device is inactive: ${deviceSerial}`);
    }

    return device;
  }

  // ─── Authenticate Biometric Payload ───────────────────────────────────
  async authenticateBiometric(payload: {
    device_serial:    string;
    device_token:     string;   // signed device JWT
    employee_id:      number;
    action:           BiometricAction;
    auth_type:        string;
    confidence_score: number;
    ip_address?:      string;
  }): Promise<{ success: boolean; device: BiometricDevice; employee_id: number }> {
    const device = await this.validateDevice(payload.device_serial, payload.ip_address);

    // ── Verify device JWT ───────────────────────────────────────────────
    try {
      const secret = device.jwt_secret || process.env.BIOMETRIC_JWT_SECRET || process.env.JWT_SECRET || "default_biometric_jwt_secret";
      jwt.verify(payload.device_token, secret);
    } catch {
      await this.logAuthAttempt({
        device_id:      device.id,
        employee_id:    payload.employee_id,
        company_id:     device.company_id,
        branch_id:      device.branch_id,
        action:         payload.action,
        auth_status:    BiometricAuthStatus.FAILED,
        confidence_score: payload.confidence_score,
        ip_address:     payload.ip_address,
        auth_type:      payload.auth_type,
        failure_reason: "Invalid device token",
      });
      throw new Error("Invalid device authentication token");
    }

    // ── Check confidence score ──────────────────────────────────────────
    if (payload.confidence_score < device.min_confidence_score) {
      await this.logAuthAttempt({
        device_id:      device.id,
        employee_id:    payload.employee_id,
        company_id:     device.company_id,
        branch_id:      device.branch_id,
        action:         payload.action,
        auth_status:    BiometricAuthStatus.SPOOFED,
        confidence_score: payload.confidence_score,
        ip_address:     payload.ip_address,
        auth_type:      payload.auth_type,
        failure_reason: `Low confidence score: ${payload.confidence_score} < ${device.min_confidence_score}`,
      });

      // Alert on low confidence (possible spoofing)
      await this.notificationService.sendAttendanceNotification({
        type:       NotificationType.BIOMETRIC_FAILED,
        employee_id: payload.employee_id,
        company_id:  device.company_id,
        branch_id:   device.branch_id,
        severity:   NotificationSeverity.CRITICAL,
        extra: {
          deviceSerial:   device.device_serial,
          confidenceScore: payload.confidence_score,
          reason:          "Low confidence — possible spoofing",
        },
      });

      throw new Error(`Biometric confidence too low: ${payload.confidence_score}%`);
    }

    // ── Log success ─────────────────────────────────────────────────────
    await this.logAuthAttempt({
      device_id:      device.id,
      employee_id:    payload.employee_id,
      company_id:     device.company_id,
      branch_id:      device.branch_id,
      action:         payload.action,
      auth_status:    BiometricAuthStatus.SUCCESS,
      confidence_score: payload.confidence_score,
      ip_address:     payload.ip_address,
      auth_type:      payload.auth_type,
    });

    return { success: true, device, employee_id: payload.employee_id };
  }

  // ─── Device Registration ───────────────────────────────────────────────
  async registerDevice(payload: {
    company_id:     number;
    branch_id:      number;
    device_name:    string;
    device_serial:  string;
    device_type:    string;
    ip_address?:    string;
    location?:      string;
    firmware_version?: string;
  }): Promise<BiometricDevice> {
    const repo = dataSource.getRepository(BiometricDevice);

    const existing = await repo.findOne({ where: { device_serial: payload.device_serial } });
    if (existing) throw new Error(`Device serial ${payload.device_serial} is already registered`);

    // Generate unique JWT secret for this device
    const jwtSecret = crypto.randomBytes(64).toString("hex");

    const device = repo.create({
      ...payload,
      device_type:    payload.device_type as any,
      is_whitelisted: false,
      status:         DeviceStatus.INACTIVE,
      jwt_secret:     jwtSecret,
      min_confidence_score: 80.0,
    });

    return repo.save(device);
  }

  // ─── Device Heartbeat / Ping ───────────────────────────────────────────
  async pingDevice(deviceSerial: string): Promise<BiometricDevice> {
    const repo = dataSource.getRepository(BiometricDevice);
    const device = await repo.findOne({ where: { device_serial: deviceSerial } });

    if (!device) throw new Error(`Device not found: ${deviceSerial}`);

    device.is_online   = true;
    device.last_ping_at = new Date();

    if (device.status === DeviceStatus.OFFLINE) {
      device.status = DeviceStatus.ACTIVE;
    }

    return repo.save(device);
  }

  // ─── Mark Device Offline ───────────────────────────────────────────────
  async markDeviceOffline(deviceId: number): Promise<void> {
    const repo = dataSource.getRepository(BiometricDevice);
    const device = await repo.findOne({ where: { id: deviceId } });

    if (device && device.is_online) {
      device.is_online = false;
      device.status    = DeviceStatus.OFFLINE;
      await repo.save(device);

      await this.notificationService.sendDeviceOfflineAlert({
        id:          device.id,
        company_id:  device.company_id,
        branch_id:   device.branch_id,
        device_name: device.device_name,
        location:    device.location ?? undefined,
      });
    }
  }

  // ─── Get Auth Logs ─────────────────────────────────────────────────────
  async getAuthLogs(filters: {
    company_id: number;
    branch_id?: number;
    device_id?: number;
    employee_id?: number;
    limit?: number;
  }) {
    const repo = dataSource.getRepository(BiometricAuthLog);
    const where: any = { company_id: filters.company_id };
    if (filters.branch_id)   where.branch_id   = filters.branch_id;
    if (filters.device_id)   where.device_id   = filters.device_id;
    if (filters.employee_id) where.employee_id = filters.employee_id;

    return repo.find({
      where,
      order: { id: "DESC" },
      take:  filters.limit ?? 100,
    });
  }

  // ─── Log Auth Attempt ─────────────────────────────────────────────────
  private async logAuthAttempt(data: {
    device_id:       number;
    employee_id?:    number;
    company_id:      number;
    branch_id:       number;
    action:          BiometricAction;
    auth_status:     BiometricAuthStatus;
    confidence_score?: number;
    ip_address?:     string;
    auth_type?:      string;
    attendance_id?:  number;
    failure_reason?: string;
  }) {
    const repo = dataSource.getRepository(BiometricAuthLog);
    const log  = repo.create(data);
    await repo.save(log);
  }
}
