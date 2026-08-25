import { io } from "../socket/socket";

export interface HardwareEvent {
  eventId: string;
  eventType:
    | "DEVICE_DISCOVERED"
    | "DEVICE_UPDATED"
    | "DEVICE_CONNECTED"
    | "DEVICE_DISCONNECTED"
    | "DEVICE_RECONNECTING"
    | "DEVICE_STATUS_CHANGED"
    | "DEVICE_REMOVED"
    | "TELEMETRY_UPDATED"
    | "DIAGNOSTIC_COMPLETED"
    | "HARDWARE_ERROR";
  deviceId: string;
  companyId: number;
  branchId: number;
  timestamp: string;
  payload: any;
  sequence?: number;
}

export class HardwareEventBus {
  private static sequenceCounter = 0;

  public static publish(event: Omit<HardwareEvent, "eventId" | "timestamp" | "sequence">): void {
    this.sequenceCounter++;
    const fullEvent: HardwareEvent = {
      ...event,
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      sequence: this.sequenceCounter
    };

    if (io) {
      if (fullEvent.branchId) {
        io.to(`branch_${fullEvent.branchId}`).emit("hardware_event", fullEvent);
        io.to(`branch_${fullEvent.branchId}`).emit(fullEvent.eventType.toLowerCase(), fullEvent.payload);
      } else if (fullEvent.companyId) {
        io.to(`company_${fullEvent.companyId}`).emit("hardware_event", fullEvent);
        io.to(`company_${fullEvent.companyId}`).emit(fullEvent.eventType.toLowerCase(), fullEvent.payload);
      }
    }
  }
}
