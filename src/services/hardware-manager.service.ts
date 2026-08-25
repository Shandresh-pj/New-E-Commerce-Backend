import dataSource from "../config/database";
import { HardwareDeviceEntity, ConnectionProtocol, ConnectionState, HealthState, DeviceStatus } from "../entities/hardware_device.entity";
import { HardwareAdapter } from "./hardware/hardware.adapter";
import { WifiIpAdapter } from "./hardware/wifi-ip.adapter";
import { UsbSerialAdapter } from "./hardware/usb-serial.adapter";
import { BluetoothBleAdapter } from "./hardware/bluetooth-ble.adapter";
import { NfcReaderAdapter } from "./hardware/nfc-reader.adapter";
import { ScaleAdapter } from "./hardware/scale.adapter";
import { HardwareEventBus } from "./hardware-event-bus";

export class HardwareManagerService {
  private static instance: HardwareManagerService;
  private adapters = new Map<string, HardwareAdapter>();

  public static getInstance(): HardwareManagerService {
    if (!HardwareManagerService.instance) {
      HardwareManagerService.instance = new HardwareManagerService();
    }
    return HardwareManagerService.instance;
  }

  public getAdapterForDevice(device: HardwareDeviceEntity): HardwareAdapter {
    let adapter = this.adapters.get(device.id);
    if (!adapter) {
      switch (device.protocol) {
        case ConnectionProtocol.WIFI_IP:
        case ConnectionProtocol.ETHERNET_LAN:
        case ConnectionProtocol.WEBSOCKET_LAN:
          adapter = new WifiIpAdapter(device);
          break;

        case ConnectionProtocol.WEB_SERIAL:
        case ConnectionProtocol.WEB_USB:
        case ConnectionProtocol.HID_KEYBOARD:
          adapter = new UsbSerialAdapter(device);
          break;

        case ConnectionProtocol.BLUETOOTH:
        case ConnectionProtocol.BLUETOOTH_LE:
          adapter = new BluetoothBleAdapter(device);
          break;

        case ConnectionProtocol.NFC_TAP:
          adapter = new NfcReaderAdapter(device);
          break;

        default:
          if (device.type === "WEIGH_SCALE") {
            adapter = new ScaleAdapter(device);
          } else {
            adapter = new UsbSerialAdapter(device);
          }
          break;
      }
      this.adapters.set(device.id, adapter);
    }
    return adapter;
  }

  /**
   * Execute real diagnostic suite against target hardware device
   */
  async runDiagnosticSuite(deviceId: string, companyId: number): Promise<any> {
    const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
    const device = await deviceRepo.findOne({ where: { id: deviceId, company_id: companyId } });

    if (!device) {
      throw new Error(`Device ${deviceId} not found for company ${companyId}`);
    }

    const adapter = this.getAdapterForDevice(device);
    const result = await adapter.runDiagnostics();

    device.health_state = result.overallStatus;
    device.connection_state = result.connectionState;
    device.status = result.connectionState === ConnectionState.CONNECTED ? DeviceStatus.CONNECTED : DeviceStatus.DISCONNECTED;
    device.last_seen_at = new Date();
    await deviceRepo.save(device);

    HardwareEventBus.publish({
      eventType: "DIAGNOSTIC_COMPLETED",
      deviceId: device.id,
      companyId: device.company_id,
      branchId: device.branch_id,
      payload: result
    });

    return result;
  }

  /**
   * Execute real command on physical hardware device
   */
  async executeCommand(deviceId: string, companyId: number, action: string, params?: any): Promise<any> {
    const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
    const device = await deviceRepo.findOne({ where: { id: deviceId, company_id: companyId } });

    if (!device) {
      throw new Error(`Device ${deviceId} not found for company ${companyId}`);
    }

    const adapter = this.getAdapterForDevice(device);
    const commandPayload = {
      commandId: `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      params
    };

    const result = await adapter.executeCommand(commandPayload);

    device.packets_received = (device.packets_received || 0) + 1;
    device.last_seen_at = new Date();
    device.last_telemetry_at = new Date();
    await deviceRepo.save(device);

    HardwareEventBus.publish({
      eventType: "TELEMETRY_UPDATED",
      deviceId: device.id,
      companyId: device.company_id,
      branchId: device.branch_id,
      payload: { action, result }
    });

    return result;
  }

  /**
   * Perform actual wireless scan & ping check across devices for company
   */
  async scanWirelessDevices(companyId: number, branchId?: number, wifiEnabled = true, bluetoothEnabled = true): Promise<any[]> {
    const deviceRepo = dataSource.getRepository(HardwareDeviceEntity);
    const where: any = { company_id: companyId };
    if (branchId) where.branch_id = branchId;

    const devices = await deviceRepo.find({ where, order: { updated_at: "DESC" } });
    const activeResults: any[] = [];

    for (const dev of devices) {
      const isWifi = [ConnectionProtocol.WIFI_IP, ConnectionProtocol.ETHERNET_LAN, ConnectionProtocol.WEBSOCKET_LAN].includes(dev.protocol);
      const isBt = [ConnectionProtocol.BLUETOOTH, ConnectionProtocol.BLUETOOTH_LE, ConnectionProtocol.NFC_TAP].includes(dev.protocol);

      if ((isWifi && wifiEnabled) || (isBt && bluetoothEnabled)) {
        const adapter = this.getAdapterForDevice(dev);
        const status = await adapter.getStatus();

        dev.connection_state = status.connectionState;
        dev.health_state = status.healthState;
        dev.latency_ms = status.latencyMs;
        dev.status = status.connectionState === ConnectionState.CONNECTED ? DeviceStatus.CONNECTED : DeviceStatus.DISCONNECTED;
        dev.last_seen_at = new Date();
        await deviceRepo.save(dev);

        activeResults.push({
          id: dev.id,
          name: dev.name,
          type: dev.type,
          connectionCategory: dev.connection_category,
          protocol: dev.protocol,
          status: dev.status,
          connectionState: dev.connection_state,
          healthState: dev.health_state,
          portOrAddress: dev.port_or_address,
          ipAddress: dev.ip_address,
          wifiSsid: dev.wifi_ssid,
          macAddress: dev.mac_address,
          latencyMs: dev.latency_ms,
          signalStrength: dev.signal_strength,
          signalDbm: dev.signal_dbm,
          batteryLevel: dev.battery_level,
          autoReconnect: dev.auto_reconnect,
          hardwareDetected: true
        });
      }
    }

    return activeResults;
  }
}
