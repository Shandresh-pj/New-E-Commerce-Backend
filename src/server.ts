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
// global.ts exports ALL_ENTITIES and database.ts registers them with TypeORM.
// DB_SYNC=true  → TypeORM will create/alter tables on every startup (default in dev).
// DB_SYNC=false → No auto-sync; use migrations (recommended for production).
async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    console.log("✅ Database connection established.");
  }

  // Always run synchronize in development so new entity fields are picked up.
  // In production, DB_SYNC must be explicitly set to "true" in the dashboard.
  const shouldSync =
    String(process.env.DB_SYNC ?? "true").toLowerCase().trim() === "true";

  if (shouldSync) {
    try {
      console.log("🔄 Synchronizing all entity tables with the database...");
      await dataSource.synchronize(false); // false = don't drop existing data
      console.log("✅ All entity tables are synchronized.");
    } catch (syncErr: any) {
      console.error("❌ Database synchronization failed:", syncErr.message);
      throw syncErr; // crash fast so the problem is visible
    }
  } else {
    // Even when sync is disabled, verify the DB is reachable
    try {
      await dataSource.query("SELECT 1");
    } catch (pingErr: any) {
      console.error("❌ Database ping failed:", pingErr.message);
      throw pingErr;
    }
  }

  await seedRoles();
  console.log("✅ Database ready.");
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