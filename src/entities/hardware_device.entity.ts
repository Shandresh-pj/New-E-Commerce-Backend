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

export enum ConnectionProtocol {
  WIFI_IP = "WIFI_IP",
  ETHERNET_LAN = "ETHERNET_LAN",
  WEB_SERIAL = "WEB_SERIAL",
  WEB_USB = "WEB_USB",
  BLUETOOTH = "BLUETOOTH",
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

  @Column({ type: "enum", enum: ConnectionProtocol, default: ConnectionProtocol.WIFI_IP })
  protocol!: ConnectionProtocol;

  @Column({ type: "enum", enum: DeviceStatus, default: DeviceStatus.CONNECTED })
  status!: DeviceStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  port_or_address!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  wifi_ssid!: string | null;

  @Column({ type: "int", default: 5 })
  latency_ms!: number;

  @Column({ type: "int", default: 95 })
  signal_strength!: number;

  @Column({ type: "boolean", default: true })
  auto_reconnect!: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  firmware_version!: string | null;

  @Column({ type: "json", nullable: true })
  metadata!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  last_seen_at!: Date | null;
}
