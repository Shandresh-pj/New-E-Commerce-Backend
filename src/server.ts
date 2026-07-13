import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { initializeSocket } from "./socket/socket";
import { seedRoles } from "./utils/seeds/role.seed";
import dataSource from "./config/database";
import { startAttendanceCron } from "./utils/attendance.cron";
import { EmailService } from "./utils/sendEmailOtp";
import { redisClient } from "./config/redis";

// ─── Critical Environment Validation ────────────────────────────────────────
// Fail loudly at startup if critical vars are missing — far better than silent
// failures that are hard to debug once deployed.
const REQUIRED_ENV_VARS = ["JWT_SECRET"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ [Startup] Missing required environment variables: ${missing.join(", ")}`);
  console.error("❌ [Startup] Server cannot start safely. Please set these variables in your Render dashboard.");
  process.exit(1);
}

// ─── Global Error Safety Net ────────────────────────────────────────────────
// Catch any unhandled promise rejections before they silently crash the process.
process.on("unhandledRejection", (reason: any) => {
  console.error("❌ [Process] Unhandled Promise Rejection:", reason?.message || reason);
  // Do NOT exit — log and continue. Only fatal rejections should kill the server.
});

process.on("uncaughtException", (error: Error) => {
  console.error("❌ [Process] Uncaught Exception:", error.message);
  console.error(error.stack);
  // Uncaught exceptions leave the process in an undefined state — exit and let Render restart.
  process.exit(1);
});

// ─── Database Initialization ─────────────────────────────────────────────────
async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  // Auto-sync if tables are missing
  try {
    await dataSource.query('SELECT 1 FROM "roles" LIMIT 1');
  } catch (error) {
    console.log("⚠️ Database tables missing. Forcing synchronization...");
    await dataSource.synchronize(false);
    console.log("✅ Database synchronized.");
  }

  await seedRoles();
  console.log("✅ Database Connected");
}

// ─── Server Bootstrap ────────────────────────────────────────────────────────
async function startServer() {
  try {
    await initDatabase();

    // Connect Redis — optional, never crashes the server
    try {
      await redisClient.connect();
      console.log("✅ Redis Connected");
    } catch (redisErr: any) {
      console.warn("⚠️ Redis failed to connect. Caching will be disabled:", redisErr.message);
    }

    // Verify SMTP — runs async and does not block server startup
    // Also resolves DNS to IPv4 here so it's pre-warmed before first email
    EmailService.verifyConnection().catch((err) => {
      console.warn("⚠️ [Email] Startup SMTP verification failed:", err?.message || err);
    });

    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || "0.0.0.0";

    const server = http.createServer(app);

    // Initialize Socket.IO after HTTP server
    initializeSocket(server);

    server.listen(port, host, () => {
      console.log("🚀 Server Started");
      console.log(`   URL:     http://localhost:${port}`);
      console.log(`   Swagger: http://localhost:${port}/pjsv`);
      console.log(`   Health:  http://localhost:${port}/health`);
      console.log(`   Env:     ${process.env.NODE_ENV || "development"}`);

      // Start attendance background cron jobs
      startAttendanceCron();
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────────
    // Called by Render when deploying a new version or restarting the dyno.
    // Without this, active HTTP requests and DB connections are force-killed.
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️ [Shutdown] Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("✅ [Shutdown] HTTP server closed. No new connections accepted.");

        try {
          if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log("✅ [Shutdown] Database connection pool closed.");
          }
        } catch (err: any) {
          console.error("⚠️ [Shutdown] Error closing DB:", err.message);
        }

        try {
          if (redisClient.isReady) {
            await redisClient.quit();
            console.log("✅ [Shutdown] Redis connection closed.");
          }
        } catch (err: any) {
          console.error("⚠️ [Shutdown] Error closing Redis:", err.message);
        }

        console.log("✅ [Shutdown] Graceful shutdown complete.");
        process.exit(0);
      });

      // Force-exit if shutdown takes too long (Render gives 10s before SIGKILL)
      setTimeout(() => {
        console.error("❌ [Shutdown] Timed out. Force exiting.");
        process.exit(1);
      }, 9000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (err: any) {
    console.error("❌ [Startup] Server failed to start:", err.message || err);
    process.exit(1);
  }
}

startServer();

export { dataSource };