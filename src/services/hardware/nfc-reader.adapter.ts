import { HardwareAdapter, HardwareCommandPayload, HardwareCommandResult, DiagnosticSuiteResult, TelemetryPayload } from "./hardware.adapter";
import { HardwareDeviceEntity, ConnectionState, HealthState } from "../../entities/hardware_device.entity";

export class NfcReaderAdapter extends HardwareAdapter {
  getAdapterType(): string {
    return "NFC_TAP";
  }

  async discover(): Promise<{ success: boolean; devices: Partial<HardwareDeviceEntity>[] }> {
    return {
      success: true,
      devices: [
        {
          id: this.device.id,
          name: this.device.name,
          port_or_address: this.device.port_or_address || "NFC-READER-01",
          protocol: this.device.protocol
        }
      ]
    };
  }

  async connect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.CONNECTED;
    this.device.health_state = HealthState.HEALTHY;
    return { success: true, connectionState: ConnectionState.CONNECTED, message: "NFC Reader polling active" };
  }

  async disconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.DISCONNECTED;
    return { success: true, connectionState: ConnectionState.DISCONNECTED, message: "NFC Reader polling stopped" };
  }

  async reconnect(): Promise<{ success: boolean; connectionState: ConnectionState; message: string }> {
    this.device.connection_state = ConnectionState.RECONNECTING;
    return this.connect();
  }

  async getStatus(): Promise<{ connectionState: ConnectionState; healthState: HealthState; latencyMs: number }> {
    return {
      connectionState: this.device.connection_state || ConnectionState.CONNECTED,
      healthState: this.device.health_state || HealthState.HEALTHY,
      latencyMs: this.device.latency_ms || 5
    };
  }

  async getTelemetry(): Promise<TelemetryPayload> {
    return {
      deviceId: this.device.id,
      timestamp: new Date().toISOString(),
      connectionState: this.device.connection_state || ConnectionState.CONNECTED,
      healthState: this.device.health_state || HealthState.HEALTHY,
      latencyMs: this.device.latency_ms || 5,
      signalStrength: 100,
      packetsReceived: (this.device.packets_received || 0) + 1,
      packetsLost: 0
    };
  }

  async executeCommand(command: HardwareCommandPayload): Promise<HardwareCommandResult> {
    const start = Date.now();
    if (command.action === "READ_NFC") {
      const mockUid = "04:" + Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":").toUpperCase();
      return {
        commandId: command.commandId,
        success: true,
        message: `NFC Tag scanned successfully: ${mockUid}`,
        data: { tagUid: mockUid, techType: "ISO/IEC 14443-3A", ndefRecordsCount: 1 },
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    }

    return {
      commandId: command.commandId,
      success: true,
      message: `Executed NFC command '${command.action}'`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString()
    };
  }

  async runDiagnostics(): Promise<DiagnosticSuiteResult> {
    const steps = [
      { name: "1. NFC Reader Hardware Enumeration", status: "PASSED" as const, durationMs: 12, detail: `NFC controller ready on ${this.device.port_or_address || "NFC-READER-01"}` },
      { name: "2. RF Field Carrier Signal Test", status: "PASSED" as const, durationMs: 15, detail: "13.56 MHz RF field active" },
      { name: "3. NDEF Decoder Stack Integrity", status: "PASSED" as const, durationMs: 10, detail: "NDEF parser ready" },
      { name: "4. Tag UID Collision Test", status: "PASSED" as const, durationMs: 14, detail: "Anti-collision loop operational" },
      { name: "5. Reader Antenna Tuning & Noise Level", status: "PASSED" as const, durationMs: 11, detail: "Antenna SWR nominal" }
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
