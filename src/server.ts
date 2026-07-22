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
// Check for JWT_SECRET and provide fallback for JWT_REFRESH_SECRET if not explicitly set.
const REQUIRED_ENV_VARS = ["JWT_SECRET"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ [Startup] Missing required environment variables: ${missing.join(", ")}`);
  console.error("❌ [Startup] Server cannot start safely. Please set these variables in your Render dashboard.");
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET || "fallback_refresh_secret_key_2026";
  console.log("ℹ️ [Startup] JWT_REFRESH_SECRET not explicitly set; defaulting to JWT_SECRET fallback.");
}

// ─── Production Safety Checks ──────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL && !process.env.PRODUCTION_DB_URL) {
    console.error("❌ [Startup] Production database URL is not set! Set DATABASE_URL or PRODUCTION_DB_URL in the Render dashboard.");
    process.exit(1);
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET === "YourWebhookSecretHere") {
    console.warn("⚠️ [Startup] RAZORPAY_WEBHOOK_SECRET is not set or is a placeholder. Webhook verification will be DISABLED. Set a real secret from the Razorpay Dashboard.");
  }
  if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
    console.warn("⚠️ [Startup] RAZORPAY_KEY_ID is a TEST key. Live payments will fail. Use a live key (rzp_live_...) in production.");
  }
  if (String(process.env.DB_SYNC).toLowerCase() === "true") {
    console.warn("⚠️ [Startup] DB_SYNC=true in production is dangerous! TypeORM synchronize can drop columns. Use migrations instead.");
  }
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
// DB_SYNC=false → Auto-detects missing tables and syncs if empty; otherwise skips sync for safety.
async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    console.log("✅ Database connection established.");
  }

  const dbType = (dataSource.options as any).type as string;

  // Check if core tables exist in the database
  let tablesExist = false;
  try {
    if (dbType === "mysql" || dbType === "mariadb") {
      const result = await dataSource.query("SHOW TABLES LIKE 'roles'");
      tablesExist = Array.isArray(result) && result.length > 0;
    } else {
      const result = await dataSource.query(
        "SELECT to_regclass('public.roles') AS table_exists"
      );
      tablesExist = Boolean(result && result[0] && result[0].table_exists);
    }
  } catch (checkErr: any) {
    console.warn("⚠️ [DB Check] Could not verify existing tables:", checkErr.message);
    tablesExist = false;
  }

  const envSync = String(process.env.DB_SYNC ?? "true").toLowerCase().trim() === "true";
  const shouldSync = envSync || !tablesExist;

  if (shouldSync) {
    try {
      if (!tablesExist && !envSync) {
        console.log("⚠️ [Startup] Core database tables missing! Auto-synchronizing schema for initial deployment...");
      } else {
        console.log("🔄 Synchronizing entity tables with database...");
      }
      await dataSource.synchronize(false); // false = don't drop existing data
      console.log("✅ All entity tables are synchronized.");
    } catch (syncErr: any) {
      console.error("❌ Database synchronization failed:", syncErr.message);
      throw syncErr;
    }
  } else {
    console.log("ℹ️ [Startup] Database tables detected & DB_SYNC=false. Skipping auto-sync to protect production data.");
  }

  // Pre-synchronization cleanup to prevent duplicate index failures
  try {
    if (dbType === "mysql" || dbType === "mariadb") {
      await dataSource.query("DELETE FROM `roles` WHERE `name` = '' OR `name` IS NULL");
      await dataSource.query("DELETE r1 FROM `roles` r1 INNER JOIN `roles` r2 WHERE r1.id > r2.id AND r1.name = r2.name");
    } else {
      await dataSource.query(`DELETE FROM "roles" WHERE "name" = '' OR "name" IS NULL`);
      await dataSource.query(`
        DELETE FROM "roles"
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) AS rn
            FROM "roles"
          ) sub
          WHERE rn > 1
        )
      `);
    }
  } catch (cleanErr: any) {
    console.warn("⚠️ [DB Cleanup] Roles dedup skipped:", cleanErr.message);
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