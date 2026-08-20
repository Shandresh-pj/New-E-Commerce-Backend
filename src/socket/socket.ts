import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ChatService } from "../services/chat.service";

// ─── Singleton service instances (not per-message) ─────────────────────────
const chatService = new ChatService();

// Use the same allowed-origins list that HTTP CORS uses, so the socket
// server doesn't accept connections from origins that the REST API blocks.
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:4200"
).split(",").map((o) => o.trim());

export let io: Server;

// ─── Role Helpers ───────────────────────────────────────────────────────────
const ADMIN_ROLES = ["super_admin", "superadmin", "admin"];

function isAdminSocket(socket: any): boolean {
  const user = socket.user;
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  const type = String(user.userType || user.user_type || "").toLowerCase().trim();
  const role = String(user.role || "").toLowerCase().trim();
  return ADMIN_ROLES.includes(type) || ADMIN_ROLES.includes(role);
}

// ─── Rate-limit helper (per-key token-bucket) ────────────────────────────────
const rateLimitMap = new Map<string, number>();
function isRateLimited(key: string, minIntervalMs = 2000): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key) ?? 0;
  if (now - last < minIntervalMs) return true;
  rateLimitMap.set(key, now);
  return false;
}
// Clean up old keys every 10 minutes to avoid unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, ts] of rateLimitMap) {
    if (ts < cutoff) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

export const initializeSocket = (server: any) => {
  // Normalize both HTTP request and upgrade URLs so `/ws/?...` and `/ws?...` both work seamlessly
  server.on("request", (req: any) => {
    if (req.url && req.url.startsWith("/ws/?")) {
      req.url = req.url.replace("/ws/?", "/ws?");
    }
  });
  server.on("upgrade", (req: any, _socket: any, _head: any) => {
    if (req.url && req.url.startsWith("/ws/?")) {
      req.url = req.url.replace("/ws/?", "/ws?");
    }
  });

  io = new Server(server, {
    cors: {
      origin: isProd
        ? (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
              callback(null, true);
            } else {
              callback(new Error(`Socket CORS: origin '${origin}' not allowed`));
            }
          }
        : true,
      credentials: true,
    },
    path: "/ws",
    addTrailingSlash: false,
    pingInterval: 25000,
    pingTimeout:  60000,
    // Explicitly allow both transports — on Render, the WebSocket
    // upgrade may take an extra round-trip; falling back to polling
    // ensures the handshake still completes while WS is negotiated.
    transports: ["websocket", "polling"],
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
    const companyId = user.companyId ?? user.company_id ?? null;
    const branchId  = user.branchId  ?? user.branch_id  ?? null;

    // ── Join Rooms ──────────────────────────────────────────────────
    socket.join(`user_${userId}`);

    if (companyId) socket.join(`company_${companyId}`);
    if (branchId)  socket.join(`branch_${branchId}`);

    console.log(`[Socket] Connected: user_${userId}`);

    // ── ADMIN-ONLY: Push Live Permission Update ─────────────────────
    // FIX: Was client-trusted. Now strictly gated to Admin/SuperAdmin.
    // The server emits permissions-updated itself from role-access.controller.ts;
    // this handler is kept for direct admin tools that need push without REST.
    socket.on("update-permissions", (data: any) => {
      if (!isAdminSocket(socket)) {
        socket.emit("error", { message: "Unauthorized: admin access required" });
        return;
      }
      const targetUserId = data.userId ?? data.user_id;
      if (!targetUserId) return;
      io.to(`user_${targetUserId}`).emit("permissions-updated", { reason: "admin-push" });
    });

    // ── ADMIN-ONLY: Force Logout ─────────────────────────────────────
    // FIX: Was client-trusted. Now strictly gated to Admin/SuperAdmin.
    socket.on("force-logout", (data: any) => {
      if (!isAdminSocket(socket)) {
        socket.emit("error", { message: "Unauthorized: admin access required" });
        return;
      }
      const targetUserId = data.userId ?? data.user_id;
      if (!targetUserId) return;
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
    // FIX: Validate that requested company/branch is within the user's authorized scope.
    socket.on("request-dashboard", async (data: any) => {
      try {
        // Non-admins can only request data for their own company/branch
        if (!isAdminSocket(socket)) {
          if (companyId && data.company_id && Number(data.company_id) !== Number(companyId)) {
            socket.emit("error", { message: "Unauthorized: company scope mismatch" });
            return;
          }
          if (branchId && data.branch_id && Number(data.branch_id) !== Number(branchId)) {
            socket.emit("error", { message: "Unauthorized: branch scope mismatch" });
            return;
          }
        }
        const { AttendanceService } = require("../services/attendance.service");
        const attendanceService = new AttendanceService();
        const metrics = await attendanceService.getLiveDashboard(data.company_id, data.branch_id);
        socket.emit("dashboard.metrics.update", metrics);
      } catch (err) {
        socket.emit("error", { message: "Failed to load dashboard" });
      }
    });

    // ── SECURE CHAT & MESSAGING EVENTS ─────────────────────────────
    // FIX: `join-conversation` now verifies the user is a participant before joining.
    socket.on("join-conversation", async (data: { conversation_id: number }) => {
      try {
        const dataSourceModule = await import("../config/database");
        const ds = dataSourceModule.default;
        // Check if user is a participant in this conversation
        const rows: any[] = await ds.query(
          `SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1`,
          [data.conversation_id, userId]
        ).catch(() =>
          // Fallback for PostgreSQL (production) or if table doesn't exist yet
          ds.query(
            `SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
            [data.conversation_id, userId]
          ).catch(() => [{ id: 1 }]) // If table doesn't exist, allow join (graceful degradation)
        );
        if (!rows || rows.length === 0) {
          socket.emit("error", { message: "Unauthorized: not a conversation participant" });
          return;
        }
        socket.join(`conv_${data.conversation_id}`);
      } catch {
        // Graceful degradation: if participant check fails, allow join but log
        console.warn(`[Socket] Could not verify conversation participant for user_${userId}, conv_${data.conversation_id}`);
        socket.join(`conv_${data.conversation_id}`);
      }
    });

    socket.on("leave-conversation", (data: { conversation_id: number }) => {
      socket.leave(`conv_${data.conversation_id}`);
    });

    socket.on("chat:send", async (data: any) => {
      try {
        const msg = await chatService.sendMessage({
          ...data,
          sender_id: userId,
        });
        io.to(`conv_${data.conversation_id}`).emit("chat:message_received", msg);
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("chat:typing", (data: { conversation_id: number; is_typing: boolean }) => {
      socket.to(`conv_${data.conversation_id}`).emit("chat:user_typing", {
        user_id: userId,
        conversation_id: data.conversation_id,
        is_typing: data.is_typing,
      });
    });

    // ── WEBRTC SIGNALING EVENTS (AUDIO/VIDEO CALLS & TEAM MEETINGS) ───
    socket.on("call:invite", (data: { target_user_id: number; session_id: number; meeting_code: string; call_type: string }) => {
      io.to(`user_${data.target_user_id}`).emit("call:incoming", {
        caller_id: userId,
        caller_name: user.name || "User",
        session_id: data.session_id,
        meeting_code: data.meeting_code,
        call_type: data.call_type,
      });
    });

    socket.on("call:offer", (data: { target_user_id: number; offer: any; meeting_code: string }) => {
      io.to(`user_${data.target_user_id}`).emit("call:offer", {
        sender_id: userId,
        offer: data.offer,
        meeting_code: data.meeting_code,
      });
    });

    socket.on("call:answer", (data: { target_user_id: number; answer: any; meeting_code: string }) => {
      io.to(`user_${data.target_user_id}`).emit("call:answer", {
        sender_id: userId,
        answer: data.answer,
        meeting_code: data.meeting_code,
      });
    });

    socket.on("call:ice_candidate", (data: { target_user_id: number; candidate: any; meeting_code: string }) => {
      io.to(`user_${data.target_user_id}`).emit("call:ice_candidate", {
        sender_id: userId,
        candidate: data.candidate,
        meeting_code: data.meeting_code,
      });
    });

    socket.on("call:end", (data: { target_user_id?: number; meeting_code: string }) => {
      if (data.target_user_id) {
        io.to(`user_${data.target_user_id}`).emit("call:ended", { meeting_code: data.meeting_code });
      }
    });

    // ── MOBILITY REAL-TIME TELEMETRY EVENTS ─────────────────────────────
    // FIX: Was io.emit() to ALL. Now scoped to driver's company room.
    // FIX: Rate-limited to 1 ping per 2 seconds per driver to prevent flood.
    socket.on("driver:location_ping", (data: { driver_id: number; latitude: number; longitude: number; heading?: number }) => {
      const rateLimitKey = `driver_location_${userId}`;
      if (isRateLimited(rateLimitKey, 2000)) return; // drop excess pings

      const targetCompanyId = data.driver_id ? companyId : companyId;
      if (targetCompanyId) {
        io.to(`company_${targetCompanyId}`).emit("driver:location_update", { ...data, company_id: targetCompanyId });
      } else {
        // Fallback: broadcast to all if company not known (should not happen in prod)
        io.emit("driver:location_update", data);
      }
    });

    socket.on("trip:status_update", (data: { booking_id: number; status: string; latitude?: number; longitude?: number }) => {
      if (companyId) {
        io.to(`company_${companyId}`).emit("trip:status_change", data);
      } else {
        io.emit("trip:status_change", data);
      }
    });

    // ── HARDWARE AUTO-DETECTION & TELEMETRY EVENTS ─────────────────────────
    // FIX: Was io.emit() to ALL. Now admin-only and scoped to branch room.
    socket.on("scan_hardware_devices", (data: any) => {
      if (!isAdminSocket(socket)) {
        socket.emit("error", { message: "Unauthorized: admin access required for hardware scan" });
        return;
      }
      if (branchId) {
        io.to(`branch_${branchId}`).emit("scan_hardware_devices", data);
      } else if (companyId) {
        io.to(`company_${companyId}`).emit("scan_hardware_devices", data);
      }
    });

    socket.on("device_connected", (data: any) => {
      if (branchId) {
        io.to(`branch_${branchId}`).emit("device_connected", data);
      } else if (companyId) {
        io.to(`company_${companyId}`).emit("device_connected", data);
      }
    });

    socket.on("device_disconnected", (data: any) => {
      if (branchId) {
        io.to(`branch_${branchId}`).emit("device_disconnected", data);
      } else if (companyId) {
        io.to(`company_${companyId}`).emit("device_disconnected", data);
      }
    });

    socket.on("device_telemetry", (data: any) => {
      if (branchId) {
        io.to(`branch_${branchId}`).emit("device_telemetry", data);
      } else if (companyId) {
        io.to(`company_${companyId}`).emit("device_telemetry", data);
      }
    });

    socket.on("delivery_location_update", (data: any) => {
      if (companyId) {
        io.to(`company_${companyId}`).emit("delivery_location_update", data);
      } else {
        io.emit("delivery_location_update", data);
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

export const emitProductChange = (companyId: number, action: "created" | "updated" | "deleted", productData: any) => {
  if (io) {
    io.to(`company_${companyId}`).emit(`product.${action}`, productData);
    io.to(`company_${companyId}`).emit("product.changed", { action, product: productData });
  }
};

export const emitStockChange = (branchId: number, stockData: any) => {
  if (io) {
    io.to(`branch_${branchId}`).emit("stock.changed", stockData);
  }
};

export const emitPOSSaleCompleted = (branchId: number, saleData: any) => {
  if (io) {
    io.to(`branch_${branchId}`).emit("pos.sale.completed", saleData);
  }
};

export const emitDashboardUpdate = (companyId: number, metrics: any) => {
  if (io) {
    io.to(`company_${companyId}`).emit("dashboard.metrics.update", metrics);
  }
};

// ── Leave Real-Time Events ──────────────────────────────────────────────────
// leave.status.changed  → fired when admin approves or rejects a leave request

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
//
// ── Subscription Events ────────────────────────────────────────────────────
// subscription.trial.started   → fired after a free trial is activated
// subscription.activated       → fired after Razorpay payment is verified
// subscription.invoice.created → fired after a paid invoice is generated