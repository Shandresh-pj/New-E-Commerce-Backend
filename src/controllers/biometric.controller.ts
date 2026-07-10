import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger } from "../decorators";
import dataSource from "../config/database";
import { BiometricService } from "../services/biometric.service";
import { AttendanceService } from "../services/attendance.service";
import { BiometricDevice, DeviceStatus } from "../entities/biometric_device.entity";
import { BiometricAction } from "../entities/biometric_device.entity";
import { AttendanceSource, AuthType, BreakType } from "../entities/attendance.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

const biometricService  = new BiometricService();
const attendanceService = new AttendanceService();

@Controller("/biometric")
export class BiometricController {

  // ── Register Device (Super Admin only) ───────────────────────────────
  @Post("/device/register")
  @Swagger("Register Device", "Register a new biometric device (Super Admin)")
  async registerDevice(req: any, res: Response) {
    const { device_name, device_serial, device_type, ip_address, location, firmware_version } = req.body;

    if (!device_name || !device_serial || !device_type) {
      return res.status(400).json({ success: false, message: "device_name, device_serial, device_type are required" });
    }

    const device = await biometricService.registerDevice({
      company_id:  req.user.companyId,
      branch_id:   req.user.branchId,
      device_name, device_serial, device_type,
      ip_address, location, firmware_version,
    });

    return res.status(201).json({
      success: true,
      message: "Device registered. Whitelist it to activate.",
      data: { ...device, jwt_secret: device.jwt_secret },  // return secret on registration only
    });
  }

  // ── Device Heartbeat / Ping ───────────────────────────────────────────
  @Post("/device/ping")
  @Swagger("Device Ping", "Heartbeat from biometric device to mark online status")
  async ping(req: any, res: Response) {
    const { device_serial } = req.body;
    if (!device_serial) return res.status(400).json({ success: false, message: "device_serial is required" });

    const device = await biometricService.pingDevice(device_serial);
    return res.json({ success: true, data: { id: device.id, is_online: device.is_online, last_ping_at: device.last_ping_at } });
  }

  // ── List Devices ──────────────────────────────────────────────────────
  @Get("/device")
  @Swagger("Device List", "List all registered biometric devices")
  async listDevices(req: any, res: Response) {
    const repo    = dataSource.getRepository(BiometricDevice);
    const devices = await repo.find({
      where: TenantService.scopeWhere(req.user),
      order: { id: "DESC" },
    });

    // Strip jwt_secret from list response
    const sanitized = devices.map((d) => {
      const { jwt_secret, ...rest } = d as any;
      return rest;
    });

    return res.json({ success: true, data: sanitized });
  }

  // ── Update Device (whitelist/blacklist) ───────────────────────────────
  @Put("/device/:id")
  @Swagger("Update Device", "Update device settings — whitelist, status, location")
  async updateDevice(req: any, res: Response) {
    const repo   = dataSource.getRepository(BiometricDevice);
    const device = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    const allowed = ["device_name", "ip_address", "location", "is_whitelisted", "status", "firmware_version", "min_confidence_score"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) (device as any)[f] = req.body[f]; });

    // If whitelisting, set to active
    if (req.body.is_whitelisted === true && device.status === DeviceStatus.INACTIVE) {
      device.status = DeviceStatus.ACTIVE;
    }

    await repo.save(device);
    const { jwt_secret, ...rest } = device as any;
    return res.json({ success: true, message: "Device updated", data: rest });
  }

  // ── Delete Device ─────────────────────────────────────────────────────
  @Delete("/device/:id")
  @Swagger("Delete Device", "Remove a biometric device")
  async deleteDevice(req: any, res: Response) {
    const repo   = dataSource.getRepository(BiometricDevice);
    const device = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });
    await repo.remove(device);
    return res.json({ success: true, message: "Device removed" });
  }

  // ── Biometric Check-In ────────────────────────────────────────────────
  @Post("/checkin")
  @Swagger("Biometric Check-In", "Process check-in from a biometric device")
  async biometricCheckIn(req: any, res: Response) {
    const {
      device_serial, device_token, employee_id,
      auth_type, confidence_score, gps_lat, gps_lng,
    } = req.body;

    if (!device_serial || !device_token || !employee_id) {
      return res.status(400).json({ success: false, message: "device_serial, device_token, employee_id are required" });
    }

    // Validate biometric auth
    const { device } = await biometricService.authenticateBiometric({
      device_serial,
      device_token,
      employee_id: Number(employee_id),
      action:      BiometricAction.CHECK_IN,
      auth_type:   auth_type ?? "FINGERPRINT",
      confidence_score: Number(confidence_score ?? 90),
      ip_address:  req.ip,
    });

    // Process check-in
    const attendance = await attendanceService.processCheckIn({
      employee_id:  Number(employee_id),
      company_id:   device.company_id,
      branch_id:    device.branch_id,
      source:       AttendanceSource.BIOMETRIC,
      device_id:    device.id,
      device_serial: device.device_serial,
      device_ip:    device.ip_address ?? undefined,
      device_location: device.location ?? undefined,
      auth_type:    auth_type as AuthType,
      confidence_score: Number(confidence_score),
      ip_address:   req.ip,
      gps_lat:      gps_lat ? Number(gps_lat) : undefined,
      gps_lng:      gps_lng ? Number(gps_lng) : undefined,
    });

    return res.status(201).json({ success: true, message: "Biometric check-in recorded", data: attendance });
  }

  // ── Biometric Check-Out ───────────────────────────────────────────────
  @Post("/checkout/:attendanceId")
  @Swagger("Biometric Check-Out", "Process check-out from a biometric device")
  async biometricCheckOut(req: any, res: Response) {
    const { device_serial, device_token, employee_id, confidence_score, auth_type } = req.body;
    const { attendanceId } = req.params;

    if (!device_serial || !device_token || !employee_id) {
      return res.status(400).json({ success: false, message: "device_serial, device_token, employee_id are required" });
    }

    await biometricService.authenticateBiometric({
      device_serial, device_token,
      employee_id: Number(employee_id),
      action:      BiometricAction.CHECK_OUT,
      auth_type:   auth_type ?? "FINGERPRINT",
      confidence_score: Number(confidence_score ?? 90),
      ip_address:  req.ip,
    });

    const result = await attendanceService.processCheckOut(Number(attendanceId), { ip_address: req.ip });
    return res.json({ success: true, message: "Biometric check-out recorded", data: result });
  }

  // ── Biometric Break Start ─────────────────────────────────────────────
  @Post("/break-in")
  @Swagger("Biometric Break Start", "Start break from biometric device")
  async biometricBreakIn(req: any, res: Response) {
    const { device_serial, device_token, employee_id, attendance_id, break_type, confidence_score, auth_type } = req.body;

    await biometricService.authenticateBiometric({
      device_serial, device_token,
      employee_id: Number(employee_id),
      action:      BiometricAction.BREAK_START,
      auth_type:   auth_type ?? "FINGERPRINT",
      confidence_score: Number(confidence_score ?? 90),
      ip_address:  req.ip,
    });

    const breakLog = await attendanceService.processBreakStart(
      Number(attendance_id),
      break_type ?? BreakType.PERSONAL,
      {}
    );

    return res.status(201).json({ success: true, message: "Break started", data: breakLog });
  }

  // ── Biometric Break End ───────────────────────────────────────────────
  @Post("/break-out/:breakLogId")
  @Swagger("Biometric Break End", "End break from biometric device")
  async biometricBreakOut(req: any, res: Response) {
    const { device_serial, device_token, employee_id, confidence_score, auth_type } = req.body;
    const { breakLogId } = req.params;

    await biometricService.authenticateBiometric({
      device_serial, device_token,
      employee_id: Number(employee_id),
      action:      BiometricAction.BREAK_END,
      auth_type:   auth_type ?? "FINGERPRINT",
      confidence_score: Number(confidence_score ?? 90),
      ip_address:  req.ip,
    });

    const result = await attendanceService.processBreakEnd(Number(breakLogId));
    return res.json({ success: true, message: "Break ended", data: result });
  }

  // ── Auth Logs ─────────────────────────────────────────────────────────
  @Get("/logs")
  @Swagger("Biometric Logs", "Get biometric authentication log history")
  async logs(req: any, res: Response) {
    const { device_id, employee_id, limit } = req.query;

    const logs = await biometricService.getAuthLogs({
      company_id:  req.user.companyId,
      branch_id:   req.user.branchId,
      device_id:   device_id   ? Number(device_id)   : undefined,
      employee_id: employee_id ? Number(employee_id) : undefined,
      limit:       limit       ? Number(limit)        : 100,
    });

    return res.json({ success: true, data: logs });
  }
}
