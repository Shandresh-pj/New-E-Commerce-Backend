import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Use the same allowed-origins list that HTTP CORS uses, so the socket
// server doesn't accept connections from origins that the REST API blocks.
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:4200"
).split(",").map((o) => o.trim());

export let io: Server;

export const initializeSocket = (server: any) => {
  // Normalize both HTTP request and upgrade URLs so `/ws/?...` and `/ws?...` both work seamlessly
  server.on("request", (req: any) => {
    if (req.url && req.url.startsWith("/ws/?")) {
      req.url = req.url.replace("/ws/?", "/ws?");
    }
  });
  server.on("upgrade", (req: any, socket: any, head: any) => {
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

    // ── SECURE CHAT & MESSAGING EVENTS ─────────────────────────────
    socket.on("join-conversation", (data: { conversation_id: number }) => {
      socket.join(`conv_${data.conversation_id}`);
    });

    socket.on("leave-conversation", (data: { conversation_id: number }) => {
      socket.leave(`conv_${data.conversation_id}`);
    });

    socket.on("chat:send", async (data: any) => {
      try {
        const { ChatService } = require("../services/chat.service");
        const service = new ChatService();
        const msg = await service.sendMessage({
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
        caller_name: user.name || 'User',
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
    socket.on("driver:location_ping", (data: { driver_id: number; latitude: number; longitude: number; heading?: number }) => {
      io.emit("driver:location_update", data);
    });

    socket.on("trip:status_update", (data: { booking_id: number; status: string; latitude?: number; longitude?: number }) => {
      io.emit("trip:status_change", data);
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

export const emitProductChange = (companyId: number, action: 'created' | 'updated' | 'deleted', productData: any) => {
  if (io) {
    io.to(`company_${companyId}`).emit(`product.${action}`, productData);
    io.to(`company_${companyId}`).emit('product.changed', { action, product: productData });
  }
};

export const emitStockChange = (branchId: number, stockData: any) => {
  if (io) {
    io.to(`branch_${branchId}`).emit('stock.changed', stockData);
  }
};

export const emitPOSSaleCompleted = (branchId: number, saleData: any) => {
  if (io) {
    io.to(`branch_${branchId}`).emit('pos.sale.completed', saleData);
  }
};

export const emitDashboardUpdate = (companyId: number, metrics: any) => {
  if (io) {
    io.to(`company_${companyId}`).emit('dashboard.metrics.update', metrics);
  }
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
//
// ── Subscription Events ────────────────────────────────────────────────────
// subscription.trial.started   → fired after a free trial is activated
// subscription.activated       → fired after Razorpay payment is verified
// subscription.invoice.created → fired after a paid invoice is generated