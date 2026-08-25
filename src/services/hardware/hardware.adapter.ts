import { HardwareDeviceEntity, ConnectionState, HealthState } from "../../entities/hardware_device.entity";

export interface HardwareCommandPayload {
  commandId: string;
  action: string;
  params?: Record<string, any>;
  requestedBy?: number;
}

export interface HardwareCommandResult {
  commandId: string;
  success: boolean;
  message: string;
  data?: any;
  durationMs: number;
  errorCode?: string;
  timestamp: string;
}

export interface DiagnosticStepResult {
  name: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "NOT_SUPPORTED" | "TIMEOUT";
  durationMs: number;
  detail: string;
  errorCode?: string;
}

export interface DiagnosticSuiteResult {
  deviceId: string;
  deviceName: string;
  protocol: string;
  overallStatus: HealthState;
  connectionState: ConnectionState;
  diagnostics: DiagnosticStepResult[];
  executedAt: string;
}

export interface TelemetryPayload {
  deviceId: string;
  timestamp: string;
  connectionState: ConnectionState;
  healthState: HealthState;
  latencyMs: number;
  signalStrength: number;
  signalDbm?: number;
  batteryLevel?: number;
  packetsReceived: number;
  packetsLost: number;
  hardwareResponseTimeMs?: number;
  metrics?: Record<string, any>;
}

export abstract class HardwareAdapter {
  protected device: HardwareDeviceEntity;

  constructor(device: HardwareDeviceEntity) {
    this.device = device;
  }

  abstract getAdapterType(): string;
  abstract discover(): Promise<{ success: boolean; devices: Partial<HardwareDeviceEntity>[] }>;
  abstract connect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }>;
  abstract disconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }>;
  abstract reconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }>;
  abstract getStatus(): Promise<{ connectionState: ConnectionState; healthState: HealthState; latencyMs: number }>;
  abstract getTelemetry(): Promise<TelemetryPayload>;
  abstract executeCommand(command: HardwareCommandPayload): Promise<HardwareCommandResult>;
  abstract runDiagnostics(): Promise<DiagnosticSuiteResult>;
  abstract dispose(): Promise<void>;
}
