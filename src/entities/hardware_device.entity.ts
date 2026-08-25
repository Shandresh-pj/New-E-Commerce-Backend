import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";

export enum DeviceType {
  THERMAL_PRINTER = "THERMAL_PRINTER",
  BARCODE_SCANNER = "BARCODE_SCANNER",
  WEIGH_SCALE = "WEIGH_SCALE",
  CARD_READER = "CARD_READER",
  CUSTOMER_DISPLAY = "CUSTOMER_DISPLAY",
  BIOMETRIC_READER = "BIOMETRIC_READER",
  CASH_DRAWER = "CASH_DRAWER"
}

export enum ConnectionCategory {
  WIRED = "WIRED",
  WIRELESS = "WIRELESS"
}

export enum ConnectionProtocol {
  WIFI_IP = "WIFI_IP",
  ETHERNET_LAN = "ETHERNET_LAN",
  WEB_SERIAL = "WEB_SERIAL",
  WEB_USB = "WEB_USB",
  BLUETOOTH = "BLUETOOTH",
  BLUETOOTH_LE = "BLUETOOTH_LE",
  NFC_TAP = "NFC_TAP",
  ZIGBEE_MESH = "ZIGBEE_MESH",
  WEBSOCKET_LAN = "WEBSOCKET_LAN",
  MQTT_CLOUD = "MQTT_CLOUD",
  HID_KEYBOARD = "HID_KEYBOARD"
}

export enum DeviceStatus {
  CONNECTED = "CONNECTED",
  SCANNING = "SCANNING",
  DISCONNECTED = "DISCONNECTED",
  FAULTY = "FAULTY"
}

export enum ConnectionState {
  DISCOVERING = "DISCOVERING",
  DISCOVERED = "DISCOVERED",
  PAIRING = "PAIRING",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  DEGRADED = "DEGRADED",
  RECONNECTING = "RECONNECTING",
  DISCONNECTED = "DISCONNECTED",
  ERROR = "ERROR",
  UNSUPPORTED = "UNSUPPORTED",
  PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
}

export enum HealthState {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  ERROR = "ERROR",
  UNKNOWN = "UNKNOWN"
}

@Entity("hardware_devices")
export class HardwareDeviceEntity {

  @PrimaryColumn({ type: "varchar", length: 100 })
  id!: string;

  @Index()
  @Column({ type: "int", default: 1 })
  company_id!: number;

  @Index()
  @Column({ type: "int", default: 1 })
  branch_id!: number;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "enum", enum: DeviceType, default: DeviceType.THERMAL_PRINTER })
  type!: DeviceType;

  @Column({ type: "enum", enum: ConnectionCategory, default: ConnectionCategory.WIRED })
  connection_category!: ConnectionCategory;

  @Column({ type: "enum", enum: ConnectionProtocol, default: ConnectionProtocol.WIFI_IP })
  protocol!: ConnectionProtocol;

  @Column({ type: "enum", enum: DeviceStatus, default: DeviceStatus.CONNECTED })
  status!: DeviceStatus;

  @Column({ type: "enum", enum: ConnectionState, default: ConnectionState.CONNECTED })
  connection_state!: ConnectionState;

  @Column({ type: "enum", enum: HealthState, default: HealthState.HEALTHY })
  health_state!: HealthState;

  @Column({ type: "varchar", length: 255, nullable: true })
  port_or_address!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  wifi_ssid!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  mac_address!: string | null;

  @Column({ type: "int", default: 5 })
  latency_ms!: number;

  @Column({ type: "int", default: 95 })
  signal_strength!: number;

  @Column({ type: "int", nullable: true, default: -55 })
  signal_dbm!: number | null;

  @Column({ type: "int", nullable: true, default: 98 })
  battery_level!: number | null;

  @Column({ type: "boolean", default: true })
  auto_reconnect!: boolean;

  @Column({ type: "boolean", default: false })
  agent_connected!: boolean;

  @Column({ type: "boolean", default: true })
  hardware_detected!: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  firmware_version!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  error_code!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  device_fingerprint!: string | null;

  @Column({ type: "json", nullable: true })
  metadata!: any;

  @Column({ type: "json", nullable: true })
  capabilities!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "int", default: 0 })
  packets_received!: number;

  @Column({ type: "timestamp", nullable: true })
  last_seen_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  last_telemetry_at!: Date | null;
}
