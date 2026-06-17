import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export let io: Server;

export const initializeSocket = (server: any) => {

  io = new Server(server, {
    cors: { origin: "*" },
    path: "/ws"
  });

  // ================= AUTH =================
  io.use((socket: any, next) => {

    try {

      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET!);

      socket.user = decoded;

      next();

    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  // ================= CONNECTION =================
  io.on("connection", (socket: any) => {

    const user = socket.user;

    // USER ROOM
    socket.join(`user_${user.user_id}`);

    // COMPANY ROOM
    if (user.company_id) {
      socket.join(`company_${user.company_id}`);
    }

    // BRANCH ROOM
    if (user.branch_id) {
      socket.join(`branch_${user.branch_id}`);
    }

    // ================= LIVE PERMISSION UPDATE =================
    socket.on("update-permissions", (data: any) => {

      io.to(`user_${data.user_id}`).emit(
        "permissions-updated",
        data.permissions
      );
    });

    // ================= FORCE LOGOUT =================
    socket.on("force-logout", (data: any) => {

      io.to(`user_${data.user_id}`).emit(
        "logout",
        { reason: "Access revoked" }
      );
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });

  return io;
};