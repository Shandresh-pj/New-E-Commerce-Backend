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
// DB_SYNC=false → No auto-sync; use migrations (recommended for production).
async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    console.log("✅ Database connection established.");
  }

  // Pre-synchronization cleanup to prevent unique index creation failures from duplicate/empty records
  // Auto-detect the DB type so we use the correct SQL dialect (MySQL vs PostgreSQL)
  const dbType = (dataSource.options as any).type as string;
  try {
    if (dbType === "mysql" || dbType === "mariadb") {
      // MySQL: backtick identifiers, multi-table DELETE
      await dataSource.query("DELETE FROM `roles` WHERE `name` = '' OR `name` IS NULL");
      await dataSource.query("DELETE r1 FROM `roles` r1 INNER JOIN `roles` r2 WHERE r1.id > r2.id AND r1.name = r2.name");
    } else {
      // PostgreSQL: double-quote identifiers, CTE-based dedup
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
    // Ignore if table does not exist yet on fresh install
    console.warn("⚠️ [DB Cleanup] Roles dedup skipped:", cleanErr.message);
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