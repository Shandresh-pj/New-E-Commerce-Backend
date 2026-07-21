import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
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

  // ── Register Device ───────────────────────────────────────────────
  @Post("/device/register")
  @Middleware([authenticateMiddleware])
  @Swagger("Register Device", "Register a new biometric device")
  async registerDevice(req: any, res: Response) {
    try {
      const { device_name, device_serial, device_type, ip_address, location, firmware_version } = req.body;

      if (!device_name || !device_serial || !device_type) {
        return res.status(400).json({ success: false, message: "device_name, device_serial, device_type are required" });
      }

      const device = await biometricService.registerDevice({
        company_id:  req.user?.companyId || req.user?.company_id || 1,
        branch_id:   req.user?.branchId || req.user?.branch_id || 1,
        device_name, device_serial, device_type,
        ip_address, location, firmware_version,
      });

      return res.status(201).json({
        success: true,
        message: "Device registered. Whitelist it to activate.",
        data: { ...device, jwt_secret: device.jwt_secret },
      });
    } catch (err: any) {
      console.error("[BiometricController] registerDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to register device" });
    }
  }

  // ── Device Heartbeat / Ping (Public device endpoint) ──────────────────
  @Post("/device/ping")
  @Swagger("Device Ping", "Heartbeat from biometric device to mark online status")
  async ping(req: any, res: Response) {
    try {
      const { device_serial } = req.body;
      if (!device_serial) return res.status(400).json({ success: false, message: "device_serial is required" });

      const device = await biometricService.pingDevice(device_serial);
      return res.json({ success: true, data: { id: device.id, is_online: device.is_online, last_ping_at: device.last_ping_at } });
    } catch (err: any) {
      console.error("[BiometricController] ping error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Device ping failed" });
    }
  }

  // ── List Devices ──────────────────────────────────────────────────────
  @Get("/device")
  @Middleware([authenticateMiddleware])
  @Swagger("Device List", "List all registered biometric devices")
  async listDevices(req: any, res: Response) {
    try {
      const repo    = dataSource.getRepository(BiometricDevice);
      const devices = await repo.find({
        where: TenantService.scopeWhere(req.user),
        order: { id: "DESC" },
      });

      const sanitized = devices.map((d) => {
        const { jwt_secret, ...rest } = d as any;
        return rest;
      });

      return res.json({ success: true, data: sanitized });
    } catch (err: any) {
      console.error("[BiometricController] listDevices error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to list devices" });
    }
  }

  // ── Update Device (whitelist/blacklist) ───────────────────────────────
  @Put("/device/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Device", "Update device settings — whitelist, status, location")
  async updateDevice(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BiometricDevice);
      const id     = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid device ID" });

      const device = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!device) return res.status(404).json({ success: false, message: "Device not found" });

      const allowed = ["device_name", "ip_address", "location", "status", "firmware_version", "min_confidence_score"];
      allowed.forEach((f) => { if (req.body[f] !== undefined) (device as any)[f] = req.body[f]; });

      if (req.body.is_whitelisted !== undefined) {
        device.is_whitelisted = req.body.is_whitelisted === true || req.body.is_whitelisted === "true" || req.body.is_whitelisted === 1 || req.body.is_whitelisted === "1";
      }

      if (device.is_whitelisted === true && device.status === DeviceStatus.INACTIVE) {
        device.status = DeviceStatus.ACTIVE;
      }

      await repo.save(device);
      const { jwt_secret, ...rest } = device as any;
      return res.json({ success: true, message: "Device updated", data: rest });
    } catch (err: any) {
      console.error("[BiometricController] updateDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update device" });
    }
  }

  // ── Delete Device ─────────────────────────────────────────────────────
  @Delete("/device/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Device", "Remove a biometric device")
  async deleteDevice(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BiometricDevice);
      const id     = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid device ID" });

      const device = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!device) return res.status(404).json({ success: false, message: "Device not found" });
      await repo.remove(device);
      return res.json({ success: true, message: "Device removed" });
    } catch (err: any) {
      console.error("[BiometricController] deleteDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete device" });
    }
  }

  // ── Biometric Check-In (Device Payload) ───────────────────────────────
  @Post("/checkin")
  @Swagger("Biometric Check-In", "Process check-in from a biometric device")
  async biometricCheckIn(req: any, res: Response) {
    try {
      const {
        device_serial, device_token, employee_id,
        auth_type, confidence_score, gps_lat, gps_lng,
      } = req.body;

      if (!device_serial || !device_token || !employee_id) {
        return res.status(400).json({ success: false, message: "device_serial, device_token, employee_id are required" });
      }

      const { device } = await biometricService.authenticateBiometric({
        device_serial,
        device_token,
        employee_id: Number(employee_id),
        action:      BiometricAction.CHECK_IN,
        auth_type:   auth_type ?? "FINGERPRINT",
        confidence_score: Number(confidence_score ?? 90),
        ip_address:  req.ip,
      });

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
    } catch (err: any) {
      console.error("[BiometricController] biometricCheckIn error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Biometric check-in failed" });
    }
  }

  // ── Biometric Check-Out ───────────────────────────────────────────────
  @Post("/checkout/:attendanceId")
  @Swagger("Biometric Check-Out", "Process check-out from a biometric device")
  async biometricCheckOut(req: any, res: Response) {
    try {
      const { device_serial, device_token, employee_id, confidence_score, auth_type } = req.body;
      const attendanceId = Number(req.params.attendanceId);
      if (isNaN(attendanceId)) return res.status(400).json({ success: false, message: "Invalid attendance ID" });

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

      const result = await attendanceService.processCheckOut(attendanceId, { ip_address: req.ip });
      return res.json({ success: true, message: "Biometric check-out recorded", data: result });
    } catch (err: any) {
      console.error("[BiometricController] biometricCheckOut error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Biometric check-out failed" });
    }
  }

  // ── Biometric Break Start ─────────────────────────────────────────────
  @Post("/break-in")
  @Swagger("Biometric Break Start", "Start break from biometric device")
  async biometricBreakIn(req: any, res: Response) {
    try {
      const { device_serial, device_token, employee_id, attendance_id, break_type, confidence_score, auth_type } = req.body;

      if (!device_serial || !device_token || !employee_id || !attendance_id) {
        return res.status(400).json({ success: false, message: "device_serial, device_token, employee_id, and attendance_id are required" });
      }

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
    } catch (err: any) {
      console.error("[BiometricController] biometricBreakIn error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Biometric break start failed" });
    }
  }

  // ── Biometric Break End ───────────────────────────────────────────────
  @Post("/break-out/:breakLogId")
  @Swagger("Biometric Break End", "End break from biometric device")
  async biometricBreakOut(req: any, res: Response) {
    try {
      const { device_serial, device_token, employee_id, confidence_score, auth_type } = req.body;
      const breakLogId = Number(req.params.breakLogId);
      if (isNaN(breakLogId)) return res.status(400).json({ success: false, message: "Invalid break log ID" });

      if (!device_serial || !device_token || !employee_id) {
        return res.status(400).json({ success: false, message: "device_serial, device_token, and employee_id are required" });
      }

      await biometricService.authenticateBiometric({
        device_serial, device_token,
        employee_id: Number(employee_id),
        action:      BiometricAction.BREAK_END,
        auth_type:   auth_type ?? "FINGERPRINT",
        confidence_score: Number(confidence_score ?? 90),
        ip_address:  req.ip,
      });

      const result = await attendanceService.processBreakEnd(breakLogId);
      return res.json({ success: true, message: "Break ended", data: result });
    } catch (err: any) {
      console.error("[BiometricController] biometricBreakOut error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Biometric break end failed" });
    }
  }

  // ── Auth Logs ─────────────────────────────────────────────────────────
  @Get("/logs")
  @Middleware([authenticateMiddleware])
  @Swagger("Biometric Logs", "Get biometric authentication log history")
  async logs(req: any, res: Response) {
    try {
      const { device_id, employee_id, limit } = req.query;

      const logs = await biometricService.getAuthLogs({
        company_id:  req.user?.companyId || req.user?.company_id || 1,
        branch_id:   req.user?.branchId || req.user?.branch_id || 1,
        device_id:   device_id   ? Number(device_id)   : undefined,
        employee_id: employee_id ? Number(employee_id) : undefined,
        limit:       limit       ? Number(limit)        : 100,
      });

      return res.json({ success: true, data: logs });
    } catch (err: any) {
      console.error("[BiometricController] logs error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch biometric logs" });
    }
  }
}
