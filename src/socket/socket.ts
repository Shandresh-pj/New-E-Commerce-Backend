import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export let io: Server;

export const initializeSocket = (server: any) => {

  io = new Server(server, {
    cors: { origin: "*" },
    path: "/ws",
    pingInterval: 25000,
    pingTimeout:  60000,
  });

  // ═══════════════════════════════════════════════════════════════════
  // AUTH MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("No token"));
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return next(new Error("Server configuration error"));
      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONNECTION
  // ═══════════════════════════════════════════════════════════════════
  io.on("connection", (socket: any) => {
    const user   = socket.user;
    const userId = user.userId ?? user.user_id;

    // ── Join Rooms ──────────────────────────────────────────────────
    socket.join(`user_${userId}`);

    if (user.company_id) socket.join(`company_${user.company_id}`);
    if (user.companyId)  socket.join(`company_${user.companyId}`);

    if (user.branch_id)  socket.join(`branch_${user.branch_id}`);
    if (user.branchId)   socket.join(`branch_${user.branchId}`);

    console.log(`[Socket] Connected: user_${userId}`);

    // ── Live Permission Update ──────────────────────────────────────
    socket.on("update-permissions", (data: any) => {
      const targetUserId = data.userId ?? data.user_id;
      io.to(`user_${targetUserId}`).emit("permissions-updated", data.permissions);
    });

    // ── Force Logout ────────────────────────────────────────────────
    socket.on("force-logout", (data: any) => {
      const targetUserId = data.userId ?? data.user_id;
      io.to(`user_${targetUserId}`).emit("logout", { reason: "Access revoked" });
    });

    // ── Subscribe to Branch Attendance Feed ─────────────────────────
    socket.on("subscribe-attendance", (data: any) => {
      if (data.branch_id) {
        socket.join(`attendance_branch_${data.branch_id}`);
        socket.emit("subscribed", { room: `attendance_branch_${data.branch_id}` });
      }
      if (data.company_id) {
        socket.join(`attendance_company_${data.company_id}`);
        socket.emit("subscribed", { room: `attendance_company_${data.company_id}` });
      }
    });

    // ── Request Live Dashboard Data ─────────────────────────────────
    socket.on("request-dashboard", async (data: any) => {
      try {
        const { AttendanceService } = require("../services/attendance.service");
        const svc = new AttendanceService();
        const metrics = await svc.getLiveDashboard(data.company_id, data.branch_id);
        socket.emit("dashboard.metrics.update", metrics);
      } catch (err) {
        socket.emit("error", { message: "Failed to load dashboard" });
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: user_${userId}`);
    });
  });

  return io;
};

// ═══════════════════════════════════════════════════════════════════════════
// BROADCAST HELPERS (called from services)
// ═══════════════════════════════════════════════════════════════════════════

export const emitToCompany = (companyId: number, event: string, data: any) => {
  if (io) io.to(`company_${companyId}`).emit(event, data);
};

export const emitToBranch = (branchId: number, event: string, data: any) => {
  if (io) io.to(`branch_${branchId}`).emit(event, data);
};

export const emitToUser = (userId: number, event: string, data: any) => {
  if (io) io.to(`user_${userId}`).emit(event, data);
};

// ── Standard Attendance Events ─────────────────────────────────────────────
// attendance.checkin         → fired when employee checks in
// attendance.checkout        → fired when employee checks out
// attendance.break.start     → fired when break begins
// attendance.break.end       → fired when break ends
// attendance.status.changed  → fired when status changes (LATE / HALF_DAY etc)
// attendance.biometric.success → fired on successful biometric auth
// attendance.biometric.failed  → fired on failed biometric auth
// notification.created       → fired when notification is generated
// dashboard.metrics.update   → fired after any attendance event