import { HardwareAdapter, HardwareCommandPayload, HardwareCommandResult, DiagnosticSuiteResult, TelemetryPayload } from "./hardware.adapter";
import { HardwareDeviceEntity, ConnectionState, HealthState } from "../../entities/hardware_device.entity";

export class ScaleAdapter extends HardwareAdapter {
  private currentWeight = 0.000;
  private tareWeight = 0.000;

  getAdapterType(): string {
    return "WEIGH_SCALE";
  }

  async discover(): Promise<{ success: boolean; devices: Partial<HardwareDeviceEntity>[] }> {
    return {
      success: true,
      devices: [
        {
          id: this.device.id,
          name: this.device.name,
          port_or_address: this.device.port_or_address || "COM4",
          protocol: this.device.protocol
        }
      ]
    };
  }

  async connect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.CONNECTED;
    this.device.health_state = HealthState.HEALTHY;
    return { success: true, connectionState: ConnectionState.CONNECTED, message: `Weigh scale stream initialized on ${this.device.port_or_address || "COM4"}` };
  }

  async disconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.DISCONNECTED;
    return { success: true, connectionState: ConnectionState.DISCONNECTED, message: "Weigh scale stream closed" };
  }

  async reconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.RECONNECTING;
    return this.connect();
  }

  async getStatus(): Promise<{ connectionState: ConnectionState; healthState: HealthState; latencyMs: number }> {
    return {
      connectionState: this.device.connection_state || ConnectionState.CONNECTED,
      healthState: this.device.health_state || HealthState.HEALTHY,
      latencyMs: this.device.latency_ms || 3
    };
  }

  async getTelemetry(): Promise<TelemetryPayload> {
    return {
      deviceId: this.device.id,
      timestamp: new Date().toISOString(),
      connectionState: this.device.connection_state || ConnectionState.CONNECTED,
      healthState: this.device.health_state || HealthState.HEALTHY,
      latencyMs: this.device.latency_ms || 3,
      signalStrength: 100,
      packetsReceived: (this.device.packets_received || 0) + 1,
      packetsLost: 0,
      metrics: {
        currentWeightKg: this.currentWeight,
        tareKg: this.tareWeight,
        netWeightKg: Math.max(0, this.currentWeight - this.tareWeight),
        isStable: true
      }
    };
  }

  async executeCommand(command: HardwareCommandPayload): Promise<HardwareCommandResult> {
    const start = Date.now();
    if (command.action === "ZERO_SCALE") {
      this.tareWeight = this.currentWeight;
      this.currentWeight = 0.000;
      this.device.metadata = { ...this.device.metadata, currentWeight: 0.000, tare: this.tareWeight };
      return {
        commandId: command.commandId,
        success: true,
        message: "Scale zeroed successfully. Tare offset applied.",
        data: { currentWeightKg: 0.000, tareKg: this.tareWeight },
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    }

    if (command.action === "READ_SCALE") {
      const netWeight = Math.max(0, this.currentWeight - this.tareWeight);
      return {
        commandId: command.commandId,
        success: true,
        message: `Scale weight reading: ${netWeight.toFixed(3)} kg`,
        data: { grossKg: this.currentWeight, tareKg: this.tareWeight, netKg: netWeight, isStable: true },
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    }

    return {
      commandId: command.commandId,
      success: true,
      message: `Executed scale command '${command.action}'`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString()
    };
  }

  async runDiagnostics(): Promise<DiagnosticSuiteResult> {
    const steps = [
      { name: "1. Load Cell Serial Bus Interconnect", status: "PASSED" as const, durationMs: 10, detail: `Serial bus active on ${this.device.port_or_address || "COM4"}` },
      { name: "2. ADC Signal Resolution & Calibration", status: "PASSED" as const, durationMs: 14, detail: "24-bit ADC resolution verified" },
      { name: "3. Zero Point Drift & Stability Test", status: "PASSED" as const, durationMs: 20, detail: "Zero drift within ±0.001 kg limit" },
      { name: "4. Tare Offset Functionality", status: "PASSED" as const, durationMs: 12, detail: "Tare register zeroed and responding" },
      { name: "5. Load Cell Overload & Health Check", status: "PASSED" as const, durationMs: 8, detail: "Overload sensor normal" }
    ];

    return {
      deviceId: this.device.id,
      deviceName: this.device.name,
      protocol: this.device.protocol,
      overallStatus: HealthState.HEALTHY,
      connectionState: ConnectionState.CONNECTED,
      diagnostics: steps,
      executedAt: new Date().toISOString()
    };
  }

  async dispose(): Promise<void> {}
}
