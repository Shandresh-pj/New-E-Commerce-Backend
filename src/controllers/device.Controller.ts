import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { HardwareDeviceEntity, DeviceStatus, ConnectionCategory, ConnectionProtocol, DeviceType, ConnectionState, HealthState } from "../entities/hardware_device.entity";
import { HardwareManagerService } from "../services/hardware-manager.service";
import { HardwareEventBus } from "../services/hardware-event-bus";

@Controller("/devices")
export class DeviceController {

  private getHardwareManager(): HardwareManagerService {
    return HardwareManagerService.getInstance();
  }

  /**
   * Helper to extract authenticated user's companyId and branchId without unsafe || 1 fallbacks
   */
  private getTenantContext(req: any): { companyId: number; branchId?: number } {
    const user = req.user;
    if (!user) {
      throw new Error("UNAUTHORIZED_TENANT_CONTEXT: User authentication context missing");
    }

    const companyId = Number(user.companyId ?? user.company_id);
    if (!companyId || isNaN(companyId) || companyId <= 0) {
      throw new Error("UNAUTHORIZED_TENANT_CONTEXT: Valid company context required");
    }

    const branchIdRaw = user.branchId ?? user.branch_id ?? req.query?.branch_id ?? req.body?.branchId ?? req.body?.branch_id;
    const branchId = branchIdRaw ? Number(branchIdRaw) : undefined;

    return { companyId, branchId };
  }

  /**
   * Format entity into camelCase structure with connection and health state details
   */
  private formatDeviceResponse(device: HardwareDeviceEntity) {
    return {
      id: device.id,
      companyId: device.company_id,
      branchId: device.branch_id,
      name: device.name,
      type: device.type,
      connectionCategory: device.connection_category,
      protocol: device.protocol,
      status: device.status,
      connectionState: device.connection_state || ConnectionState.CONNECTED,
      healthState: device.health_state || HealthState.HEALTHY,
      portOrAddress: device.port_or_address || "",
      ipAddress: device.ip_address || undefined,
      wifiSsid: device.wifi_ssid || undefined,
      macAddress: device.mac_address || undefined,
      latencyMs: device.latency_ms,
      signalStrength: device.signal_strength,
      signalDbm: device.signal_dbm !== null ? device.signal_dbm : undefined,
      batteryLevel: device.battery_level !== null ? device.battery_level : undefined,
      autoReconnect: Boolean(device.auto_reconnect),
      agentConnected: Boolean(device.agent_connected),
      hardwareDetected: Boolean(device.hardware_detected !== false),
      firmwareVersion: device.firmware_version || undefined,
      errorCode: device.error_code || undefined,
      deviceFingerprint: device.device_fingerprint || undefined,
      metadata: device.metadata || {},
      capabilities: device.capabilities || {},
      packetsReceived: device.packets_received || 0,
      lastSeen: device.last_seen_at || device.updated_at || new Date(),
      lastTelemetryAt: device.last_telemetry_at || undefined
    };
  }

  /**
   * GET /api/devices
   * Fetch all hardware devices for authenticated tenant (Company & Branch)
   */
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Devices", "Fetch all connected and registered hardware devices for authenticated company and branch")
  async getDevices(req: any, res: Response) {
    try {
      const { companyId, branchId } = this.getTenantContext(req);
      const where: any = { company_id: companyId };
      if (branchId) where.branch_id = branchId;

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
      let entities = await deviceRepo.find({
        where,
        order: { updated_at: "DESC" }
      });

      // Auto-seed initial default hardware devices into database if company has 0 devices
      if (entities.length === 0) {
        const defaultDevices: Partial<HardwareDeviceEntity>[] = [
          {
            id: `DEV-PRN-${companyId}-01`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "Epson TM-T88VI Thermal POS Printer",
            type: DeviceType.THERMAL_PRINTER,
            connection_category: ConnectionCategory.WIRED,
            protocol: ConnectionProtocol.WEB_USB,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "USB-PRN-01",
            firmware_version: "v4.02-USB",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 3,
            signal_strength: 100
          },
          {
            id: `DEV-SCN-${companyId}-02`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "Zebra DS2278 Wireless 2D Barcode Scanner",
            type: DeviceType.BARCODE_SCANNER,
            connection_category: ConnectionCategory.WIRELESS,
            protocol: ConnectionProtocol.BLUETOOTH_LE,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "44:55:66:77:88:99",
            mac_address: "44:55:66:77:88:99",
            firmware_version: "v1.4.0-BT",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 4,
            signal_strength: 94,
            signal_dbm: -52,
            battery_level: 88
          },
          {
            id: `DEV-SCL-${companyId}-03`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "Avery Berkel FX120 Digital Weighing Scale",
            type: DeviceType.WEIGH_SCALE,
            connection_category: ConnectionCategory.WIRED,
            protocol: ConnectionProtocol.WEB_SERIAL,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "COM3",
            firmware_version: "v3.10-COM",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 2,
            signal_strength: 100
          },
          {
            id: `DEV-NFC-${companyId}-04`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "ACS ACR1252U NFC / Contactless Terminal",
            type: DeviceType.CARD_READER,
            connection_category: ConnectionCategory.WIRELESS,
            protocol: ConnectionProtocol.NFC_TAP,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "NFC-13.56MHz-READER-01",
            firmware_version: "v2.10-NFC",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 3,
            signal_strength: 98,
            signal_dbm: -35,
            battery_level: 100
          },
          {
            id: `DEV-VFD-${companyId}-05`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "Logic Controls LD9000 VFD Customer Display",
            type: DeviceType.CUSTOMER_DISPLAY,
            connection_category: ConnectionCategory.WIRED,
            protocol: ConnectionProtocol.WEB_SERIAL,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "COM4",
            firmware_version: "v1.0-VFD",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 2,
            signal_strength: 100
          },
          {
            id: `DEV-CAS-${companyId}-06`,
            company_id: companyId,
            branch_id: branchId || 1,
            name: "APG Heavy Duty 24V RJ11 Cash Drawer",
            type: DeviceType.CASH_DRAWER,
            connection_category: ConnectionCategory.WIRED,
            protocol: ConnectionProtocol.WEB_USB,
            status: DeviceStatus.CONNECTED,
            connection_state: ConnectionState.CONNECTED,
            health_state: HealthState.HEALTHY,
            port_or_address: "RJ11-COIL-01",
            firmware_version: "v1.0-RJ11",
            auto_reconnect: true,
            hardware_detected: true,
            latency_ms: 1,
            signal_strength: 100
          }
        ];

        for (const dev of defaultDevices) {
          const created = deviceRepo.create(dev as HardwareDeviceEntity);
          await deviceRepo.save(created);
        }

        entities = await deviceRepo.find({ where, order: { updated_at: "DESC" } });
      }

      const formattedDevices = entities.map(d => this.formatDeviceResponse(d));

      return res.json({
        success: true,
        count: formattedDevices.length,
        data: formattedDevices
      });
    } catch (err: any) {
      console.error("[DeviceController] getDevices error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to fetch hardware devices" });
    }
  }

  /**
   * POST /api/devices
   * Register a new hardware device dynamically into database for authenticated tenant
   */
  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Device", "Register a new hardware device dynamically into database for authenticated tenant")
  async createDevice(req: any, res: Response) {
    try {
      const { companyId, branchId: userBranchId } = this.getTenantContext(req);
      const branchId = Number(req.body?.branchId || req.body?.branch_id || userBranchId || 1);

      const {
        id,
        name,
        type,
        connectionCategory,
        protocol,
        portOrAddress,
        ipAddress,
        wifiSsid,
        macAddress,
        baudRate,
        firmwareVersion,
        autoReconnect,
        latencyMs,
        signalStrength,
        signalDbm,
        batteryLevel,
        metadata,
        capabilities
      } = req.body;

      if (!name || !type || !protocol) {
        return res.status(400).json({ success: false, message: "name, type, and protocol are required" });
      }

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
      const devId = id || `DEV-${Date.now().toString().slice(-6)}`;

      // Generate device fingerprint to prevent duplicates
      const fingerprint = `${companyId}_${branchId}_${protocol}_${macAddress || portOrAddress || devId}`;

      const newDevPayload: any = {
        id: devId,
        company_id: companyId,
        branch_id: branchId,
        name,
        type: type as DeviceType,
        connection_category: connectionCategory || (["WIFI_IP", "BLUETOOTH", "BLUETOOTH_LE", "NFC_TAP"].includes(protocol) ? ConnectionCategory.WIRELESS : ConnectionCategory.WIRED),
        protocol: protocol as ConnectionProtocol,
        status: req.body.status || DeviceStatus.CONNECTED,
        connection_state: ConnectionState.CONNECTED,
        health_state: HealthState.HEALTHY,
        port_or_address: portOrAddress || ipAddress || macAddress || null,
        ip_address: ipAddress || null,
        wifi_ssid: wifiSsid || null,
        mac_address: macAddress || null,
        latency_ms: latencyMs !== undefined ? Number(latencyMs) : 5,
        signal_strength: signalStrength !== undefined ? Number(signalStrength) : 95,
        signal_dbm: signalDbm !== undefined ? Number(signalDbm) : null,
        battery_level: batteryLevel !== undefined ? Number(batteryLevel) : null,
        firmware_version: firmwareVersion || "v1.0.0",
        auto_reconnect: autoReconnect !== undefined ? Boolean(autoReconnect) : true,
        agent_connected: false,
        hardware_detected: true,
        device_fingerprint: fingerprint,
        metadata: { baudRate: baudRate ? Number(baudRate) : null, ...metadata },
        capabilities: capabilities || {},
        last_seen_at: new Date()
      };

      const newDev = deviceRepo.create(newDevPayload as Partial<HardwareDeviceEntity>);
      const saved = (await deviceRepo.save(newDev)) as HardwareDeviceEntity;

      HardwareEventBus.publish({
        eventType: "DEVICE_CONNECTED",
        deviceId: saved.id,
        companyId: saved.company_id,
        branchId: saved.branch_id,
        payload: this.formatDeviceResponse(saved)
      });

      return res.status(201).json({
        success: true,
        message: "Hardware device registered successfully",
        data: this.formatDeviceResponse(saved)
      });
    } catch (err: any) {
      console.error("[DeviceController] createDevice error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to create hardware device" });
    }
  }

  /**
   * POST /api/devices/scan-sync
   * Bulk sync auto-detected local & network devices directly with database (Upsert)
   */
  @Post("/scan-sync")
  @Middleware([authenticateMiddleware])
  @Swagger("Sync Hardware Scan", "Bulk sync auto-detected local & network devices directly with database")
  async syncScan(req: any, res: Response) {
    try {
      const { companyId, branchId: userBranchId } = this.getTenantContext(req);
      const branchId = userBranchId || 1;

      const { devices } = req.body;
      if (!Array.isArray(devices)) {
        return res.status(400).json({ success: false, message: "devices array is required" });
      }

      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      for (const dev of devices) {
        if (!dev || !dev.id) continue;

        let existing = await deviceRepo.findOne({ where: { id: dev.id, company_id: companyId } });
        if (existing) {
          existing.status = dev.status || DeviceStatus.CONNECTED;
          existing.connection_state = dev.connectionState || ConnectionState.CONNECTED;
          existing.health_state = dev.healthState || HealthState.HEALTHY;
          if (dev.latencyMs !== undefined) existing.latency_ms = Number(dev.latencyMs);
          if (dev.signalStrength !== undefined) existing.signal_strength = Number(dev.signalStrength);
          if (dev.portOrAddress !== undefined) existing.port_or_address = dev.portOrAddress;
          existing.last_seen_at = new Date();
          await deviceRepo.save(existing);
        } else if (dev.name && dev.type && dev.protocol) {
          const fingerprint = `${companyId}_${branchId}_${dev.protocol}_${dev.macAddress || dev.portOrAddress || dev.id}`;
          const newPayload: any = {
            id: dev.id,
            company_id: companyId,
            branch_id: branchId,
            name: dev.name,
            type: dev.type as DeviceType,
            connection_category: dev.connectionCategory || (["WIFI_IP", "BLUETOOTH", "BLUETOOTH_LE", "NFC_TAP"].includes(dev.protocol) ? ConnectionCategory.WIRELESS : ConnectionCategory.WIRED),
            protocol: dev.protocol as ConnectionProtocol,
            status: dev.status || DeviceStatus.CONNECTED,
            connection_state: dev.connectionState || ConnectionState.CONNECTED,
            health_state: dev.healthState || HealthState.HEALTHY,
            port_or_address: dev.portOrAddress || dev.ipAddress || dev.macAddress || null,
            ip_address: dev.ipAddress || null,
            wifi_ssid: dev.wifiSsid || null,
            mac_address: dev.macAddress || null,
            latency_ms: dev.latencyMs !== undefined ? Number(dev.latencyMs) : 5,
            signal_strength: dev.signalStrength !== undefined ? Number(dev.signalStrength) : 95,
            firmware_version: dev.firmwareVersion || "v1.0.0",
            auto_reconnect: dev.autoReconnect !== undefined ? Boolean(dev.autoReconnect) : true,
            hardware_detected: true,
            device_fingerprint: fingerprint,
            metadata: { baudRate: dev.baudRate ? Number(dev.baudRate) : null, ...dev.metadata },
            last_seen_at: new Date()
          };
          const newEntity = deviceRepo.create(newPayload);
          await deviceRepo.save(newEntity);
        }
      }

      const where: any = { company_id: companyId };
      if (userBranchId) where.branch_id = userBranchId;

      const allDevices = await deviceRepo.find({
        where,
        order: { updated_at: "DESC" }
      });

      return res.json({
        success: true,
        count: allDevices.length,
        data: allDevices.map(d => this.formatDeviceResponse(d))
      });
    } catch (err: any) {
      console.error("[DeviceController] syncScan error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to sync devices" });
    }
  }

  /**
   * POST /api/devices/scan-wireless
   * Perform live wireless discovery & ping checks across hardware adapters
   */
  @Post("/scan-wireless")
  @Middleware([authenticateMiddleware])
  @Swagger("Wireless Radar Scan", "Scan for nearby Bluetooth BLE, Wi-Fi IP, and NFC tap devices")
  async scanWireless(req: any, res: Response) {
    try {
      const { companyId, branchId } = this.getTenantContext(req);
      const wifiEnabled = req.body?.wifiEnabled !== undefined ? Boolean(req.body.wifiEnabled) : true;
      const bluetoothEnabled = req.body?.bluetoothEnabled !== undefined ? Boolean(req.body.bluetoothEnabled) : true;

      const manager = this.getHardwareManager();
      const candidates = await manager.scanWirelessDevices(companyId, branchId, wifiEnabled, bluetoothEnabled);

      return res.json({
        success: true,
        count: candidates.length,
        wifiEnabled,
        bluetoothEnabled,
        data: candidates
      });
    } catch (err: any) {
      console.error("[DeviceController] scanWireless error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to scan wireless devices" });
    }
  }

  /**
   * PUT /api/devices/:id
   * Update device settings or status directly in database for authenticated tenant
   */
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Hardware Device", "Update device settings or status directly in database")
  async updateDevice(req: any, res: Response) {
    try {
      const { companyId } = this.getTenantContext(req);
      const { id } = req.params;
      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      let device = await deviceRepo.findOne({ where: { id, company_id: companyId } });
      if (!device) {
        return res.status(404).json({ success: false, message: `Device ${id} not found for your company` });
      }

      if (req.body.name !== undefined) device.name = req.body.name;
      if (req.body.autoReconnect !== undefined) device.auto_reconnect = Boolean(req.body.autoReconnect);
      if (req.body.status !== undefined) device.status = req.body.status;
      if (req.body.connectionState !== undefined) device.connection_state = req.body.connectionState;
      if (req.body.healthState !== undefined) device.health_state = req.body.healthState;
      if (req.body.connectionCategory !== undefined) device.connection_category = req.body.connectionCategory;
      if (req.body.portOrAddress !== undefined) device.port_or_address = req.body.portOrAddress;
      if (req.body.wifiSsid !== undefined) device.wifi_ssid = req.body.wifiSsid;
      if (req.body.macAddress !== undefined) device.mac_address = req.body.macAddress;
      if (req.body.metadata !== undefined) device.metadata = { ...device.metadata, ...req.body.metadata };

      device.last_seen_at = new Date();
      const updatedEntity = await deviceRepo.save(device);

      HardwareEventBus.publish({
        eventType: "DEVICE_UPDATED",
        deviceId: device.id,
        companyId: device.company_id,
        branchId: device.branch_id,
        payload: this.formatDeviceResponse(updatedEntity)
      });

      return res.json({
        success: true,
        message: "Device updated successfully",
        data: this.formatDeviceResponse(updatedEntity)
      });
    } catch (err: any) {
      console.error("[DeviceController] updateDevice error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to update device" });
    }
  }

  /**
   * DELETE /api/devices/:id
   * Remove a hardware device from database for authenticated tenant
   */
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Hardware Device", "Remove a registered hardware device from database")
  async deleteDevice(req: any, res: Response) {
    try {
      const { companyId } = this.getTenantContext(req);
      const { id } = req.params;
      const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);

      const device = await deviceRepo.findOne({ where: { id, company_id: companyId } });
      if (!device) {
        return res.status(404).json({ success: false, message: `Device ${id} not found` });
      }

      const result = await deviceRepo.delete({ id, company_id: companyId });

      HardwareEventBus.publish({
        eventType: "DEVICE_REMOVED",
        deviceId: id,
        companyId: device.company_id,
        branchId: device.branch_id,
        payload: { id }
      });

      return res.json({
        success: true,
        message: `Device ${id} removed from database`,
        affected: result.affected
      });
    } catch (err: any) {
      console.error("[DeviceController] deleteDevice error:", err.message);
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Failed to remove device" });
    }
  }

  /**
   * POST /api/devices/:id/telemetry
   * Execute physical hardware command (PRINT_TEST, ZERO_SCALE, READ_SCALE, PULSE_CASH_DRAWER, UPDATE_DISPLAY, READ_NFC) & record telemetry
   */
  @Post("/:id/telemetry")
  @Middleware([authenticateMiddleware])
  @Swagger("Hardware Telemetry & Command", "Execute real physical hardware action & record telemetry")
  async recordTelemetry(req: any, res: Response) {
    try {
      const { companyId } = this.getTenantContext(req);
      const { id } = req.params;
      const { action, receiptData, line1, line2, weightKg } = req.body;

      if (!action) {
        return res.status(400).json({ success: false, message: "action is required" });
      }

      const manager = this.getHardwareManager();
      const commandResult = await manager.executeCommand(id, companyId, action, { receiptData, line1, line2, weightKg });

      return res.json({
        success: commandResult.success,
        message: commandResult.message,
        data: commandResult.data,
        durationMs: commandResult.durationMs,
        timestamp: commandResult.timestamp
      });
    } catch (err: any) {
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : 500;
      return res.status(status).json({ success: false, message: err.message || "Hardware command execution failed" });
    }
  }

  /**
   * POST /api/devices/:id/diagnostic-suite
   * Execute genuine multi-stage hardware diagnostic suite using physical adapters
   */
  @Post("/:id/diagnostic-suite")
  @Middleware([authenticateMiddleware])
  @Swagger("Hardware Diagnostic Suite", "Execute genuine end-to-end multi-step diagnostic runner via hardware adapters")
  async runDiagnosticSuite(req: any, res: Response) {
    try {
      const { companyId } = this.getTenantContext(req);
      const { id } = req.params;

      const manager = this.getHardwareManager();
      const diagnosticResult = await manager.runDiagnosticSuite(id, companyId);

      return res.json({
        success: true,
        ...diagnosticResult
      });
    } catch (err: any) {
      const status = err.message?.includes("UNAUTHORIZED") ? 403 : err.message?.includes("not found") ? 404 : 500;
      return res.status(status).json({ success: false, message: err.message || "Diagnostic runner failed" });
    }
  }
}
