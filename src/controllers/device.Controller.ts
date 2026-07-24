import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { HardwareDeviceEntity, DeviceStatus } from "../entities/hardware_device.entity";

@Controller("/devices")
export class DeviceController {

  /**
   * GET /api/devices
   * Fetch all hardware devices for active company/branch
   */
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Devices", "Fetch all connected and registered hardware devices for active company and branch")
  async getDevices(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.user?.company_id || 1;
      const branchId = req.query?.branch_id || req.user?.branchId || 1;

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
      const devices = await deviceRepo.find({
        where: { company_id: Number(companyId), branch_id: Number(branchId) },
        order: { updated_at: "DESC" }
      });

      return res.json({
        success: true,
        count: devices.length,
        data: devices
      });
    } catch (err: any) {
      console.error("[DeviceController] getDevices error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch hardware devices" });
    }
  }

  /**
   * POST /api/devices
   * Register or add a new hardware device
   */
  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Register Hardware Device", "Add a new multi-protocol hardware device")
  async createDevice(req: any, res: Response) {
    try {
      const { id, name, type, protocol, portOrAddress, ipAddress, wifiSsid, baudRate, autoReconnect, metadata } = req.body;

      if (!name || !type) {
        return res.status(400).json({ success: false, message: "Device name and type are required" });
      }

      const companyId = req.user?.companyId || req.user?.company_id || 1;
      const branchId = req.body?.branch_id || req.user?.branchId || 1;
      const deviceId = id || `DEV-CST-${Date.now().toString().slice(-4)}`;

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
      const newDevice = deviceRepo.create({
        id: deviceId,
        company_id: Number(companyId),
        branch_id: Number(branchId),
        name,
        type,
        protocol: protocol || "WIFI_IP",
        status: DeviceStatus.CONNECTED,
        port_or_address: portOrAddress || null,
        ip_address: ipAddress || null,
        wifi_ssid: wifiSsid || null,
        latency_ms: Math.floor(Math.random() * 8) + 2,
        signal_strength: Math.floor(Math.random() * 10) + 90,
        auto_reconnect: autoReconnect !== undefined ? Boolean(autoReconnect) : true,
        metadata: metadata || {},
        last_seen_at: new Date()
      });

      await deviceRepo.save(newDevice);

      return res.status(201).json({
        success: true,
        message: "Hardware device registered successfully",
        data: newDevice
      });
    } catch (err: any) {
      console.error("[DeviceController] createDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to register hardware device" });
    }
  }

  /**
   * POST /api/devices/scan-sync
   * Synchronize auto-detected hardware ports with database
   */
  @Post("/scan-sync")
  @Middleware([authenticateMiddleware])
  @Swagger("Sync Hardware Scan", "Bulk sync auto-detected local & network devices")
  async syncScan(req: any, res: Response) {
    try {
      const { devices } = req.body;
      const companyId = req.user?.companyId || req.user?.company_id || 1;
      const branchId = req.user?.branchId || 1;

      if (!Array.isArray(devices)) {
        return res.status(400).json({ success: false, message: "devices array is required" });
      }

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      for (const dev of devices) {
        if (!dev.id) continue;
        let existing = await deviceRepo.findOne({ where: { id: dev.id } });
        if (existing) {
          existing.status = DeviceStatus.CONNECTED;
          existing.last_seen_at = new Date();
          existing.latency_ms = dev.latencyMs || existing.latency_ms;
          existing.signal_strength = dev.signalStrength || existing.signal_strength;
          await deviceRepo.save(existing);
        } else {
          const newDev = deviceRepo.create({
            id: dev.id,
            company_id: Number(companyId),
            branch_id: Number(branchId),
            name: dev.name,
            type: dev.type,
            protocol: dev.protocol,
            status: DeviceStatus.CONNECTED,
            port_or_address: dev.portOrAddress || null,
            ip_address: dev.ipAddress || null,
            wifi_ssid: dev.wifiSsid || null,
            latency_ms: dev.latencyMs || 5,
            signal_strength: dev.signalStrength || 95,
            auto_reconnect: dev.autoReconnect !== undefined ? dev.autoReconnect : true,
            metadata: dev.metadata || {},
            last_seen_at: new Date()
          });
          await deviceRepo.save(newDev);
        }
      }

      return res.json({
        success: true,
        message: "Devices synchronized successfully"
      });
    } catch (err: any) {
      console.error("[DeviceController] syncScan error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to sync devices" });
    }
  }

  /**
   * PUT /api/devices/:id
   * Update device settings or toggle auto-reconnect
   */
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Hardware Device", "Update device settings or status")
  async updateDevice(req: any, res: Response) {
    try {
      const { id } = req.params;
      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      let device = await deviceRepo.findOne({ where: { id } });
      if (!device) {
        return res.status(404).json({ success: false, message: `Device ${id} not found` });
      }

      if (req.body.name !== undefined) device.name = req.body.name;
      if (req.body.autoReconnect !== undefined) device.auto_reconnect = Boolean(req.body.autoReconnect);
      if (req.body.status !== undefined) device.status = req.body.status;

      await deviceRepo.save(device);

      return res.json({
        success: true,
        message: "Device updated successfully",
        data: device
      });
    } catch (err: any) {
      console.error("[DeviceController] updateDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update device" });
    }
  }

  /**
   * DELETE /api/devices/:id
   * Remove a hardware device
   */
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Hardware Device", "Remove a registered hardware device")
  async deleteDevice(req: any, res: Response) {
    try {
      const { id } = req.params;
      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      const result = await deviceRepo.delete({ id });
      return res.json({
        success: true,
        message: `Device ${id} removed`,
        affected: result.affected
      });
    } catch (err: any) {
      console.error("[DeviceController] deleteDevice error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to remove device" });
    }
  }

  /**
   * POST /api/devices/:id/telemetry
   * Record hardware telemetry action (e.g. print test, zero scale, cash pulse)
   */
  @Post("/:id/telemetry")
  @Middleware([authenticateMiddleware])
  @Swagger("Hardware Telemetry Event", "Record diagnostic hardware event")
  async recordTelemetry(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { action, receiptData } = req.body;

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
      let device = await deviceRepo.findOne({ where: { id } });
      if (device) {
        device.last_seen_at = new Date();
        await deviceRepo.save(device);
      }

      return res.json({
        success: true,
        message: `Telemetry action '${action}' logged for device ${id}`,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Telemetry logging failed" });
    }
  }
}
