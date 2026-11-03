import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { initializeSocket } from "./socket/socket";
import { seedRoles } from "./utils/seeds/role.seed";
import { seedMenus } from "./utils/seeds/menu.seed";
import dataSource from "./config/database";
import { startAttendanceCron } from "./utils/attendance.cron";
import { EmailService } from "./utils/sendEmailOtp";
import { redisClient } from "./config/redis";

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
// Runs at startup BEFORE any server/db code. Missing critical vars = hard stop.
// ALL variables below must be set in Render Dashboard -> Environment.
// =============================================================================

const isProduction = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// SECTION 1: Hard-required vars — server cannot start without these
// ---------------------------------------------------------------------------
const REQUIRED_ALWAYS: string[] = [
  "JWT_SECRET",          // signs access tokens
  "JWT_REFRESH_SECRET",  // signs refresh tokens
];

const REQUIRED_IN_PRODUCTION: string[] = [
  "NODE_ENV",            // must be "production"
  "PRODUCTION_DB_URL",   // Aiven PostgreSQL connection string
  "DB_SYNC",             // must be "false" in production
  "RESEND_API_KEY",      // email delivery
  "EMAIL_FROM",          // sender address
  "CORS_ORIGIN",         // allowed frontend origins
  "FRONTEND_URL",        // used in email links
  "APP_BASE_URL",        // used in email links
];

// Check always-required vars
const missingAlways = REQUIRED_ALWAYS.filter((k) => !process.env[k]);
if (missingAlways.length > 0) {
  console.error(`[Startup] FATAL: Missing required env vars: ${missingAlways.join(", ")}`);
  console.error("[Startup] Set these in Render Dashboard -> Environment before deploying.");
  process.exit(1);
}

// Check production-only required vars
if (isProduction) {
  const missingProd = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]);
  if (missingProd.length > 0) {
    console.error(`[Startup] FATAL: Missing production env vars: ${missingProd.join(", ")}`);
    console.error("[Startup] Add all listed vars in Render Dashboard -> Environment.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// SECTION 2: JWT_REFRESH_SECRET fallback (non-critical, but log it)
// ---------------------------------------------------------------------------
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET!;
  console.warn("[Startup] JWT_REFRESH_SECRET not set — falling back to JWT_SECRET value.");
}

// ---------------------------------------------------------------------------
// SECTION 3: Production security warnings (non-fatal, but important)
// ---------------------------------------------------------------------------
if (isProduction) {

  // DB_SYNC must be false — hard block is also in database.ts, double-checked here
  if (String(process.env.DB_SYNC).toLowerCase() === "true") {
    console.error("[Startup] FATAL: DB_SYNC=true in production can DROP database columns!");
    console.error("[Startup] Set DB_SYNC=false in Render Dashboard immediately.");
    process.exit(1);
  }

  // PRODUCTION_DB_URL must point to postgres, not local mysql
  const dbUrl = process.env.PRODUCTION_DB_URL || "";
  if (dbUrl.startsWith("mysql://") || dbUrl.includes("127.0.0.1") || dbUrl.includes("localhost")) {
    console.error("[Startup] FATAL: PRODUCTION_DB_URL points to a local database in production!");
    console.error("[Startup] Set PRODUCTION_DB_URL to the Aiven PostgreSQL connection string.");
    process.exit(1);
  }

  // Razorpay webhook secret placeholder
  if (
    !process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_WEBHOOK_SECRET === "YourWebhookSecretHere"
  ) {
    console.warn("[Startup] WARNING: RAZORPAY_WEBHOOK_SECRET is a placeholder. Webhook verification DISABLED.");
    console.warn("[Startup]          Set a real secret from the Razorpay Dashboard -> Webhooks.");
  }

  // Razorpay test key in production
  if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
    console.warn("[Startup] WARNING: RAZORPAY_KEY_ID is a TEST key. Live payments will FAIL.");
    console.warn("[Startup]          Replace with rzp_live_... key in Render Dashboard.");
  }

  // DATABASE_URL should not be set in production (it is the local MySQL URL)
  if (process.env.DATABASE_URL) {
    console.warn("[Startup] WARNING: DATABASE_URL is set in production environment.");
    console.warn("[Startup]          DATABASE_URL = local MySQL. In production only PRODUCTION_DB_URL is used.");
    console.warn("[Startup]          Consider removing DATABASE_URL from Render Dashboard to avoid confusion.");
  }

  console.log("[Startup] Environment validation passed. All required production vars are set.");
}

// =============================================================================
// GLOBAL ERROR SAFETY NET
// =============================================================================
process.on("unhandledRejection", (reason: any) => {
  console.error("[Process] Unhandled Promise Rejection:", reason?.message || reason);
  // Do NOT exit — log and continue. Only fatal rejections should kill the server.
});

process.on("uncaughtException", (error: Error) => {
  console.error("[Process] Uncaught Exception:", error.message);
  console.error(error.stack);
  // Uncaught exceptions leave the process in an undefined state.
  // Exit and let Render auto-restart.
  process.exit(1);
});

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================
async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    console.log("[DB] Connection established.");
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
    console.warn("[DB] Could not verify existing tables:", checkErr.message);
    tablesExist = false;
  }

  const envSync    = String(process.env.DB_SYNC ?? "true").toLowerCase().trim() === "true";
  const shouldSync = envSync || !tablesExist;

  if (shouldSync) {
    try {
      if (!tablesExist && !envSync) {
        console.log("[DB] Core tables missing — auto-synchronizing schema for initial deployment...");
      } else {
        console.log("[DB] Synchronizing entity tables...");
      }
      await dataSource.synchronize(false); // false = do not drop existing data
      console.log("[DB] All entity tables synchronized.");
    } catch (syncErr: any) {
      console.error("[DB] Schema synchronization failed:", syncErr.message);
      throw syncErr;
    }
  } else {
    console.log("[DB] Tables detected & DB_SYNC=false. Skipping auto-sync to protect production data.");
  }

  // Cleanup duplicate/empty roles before seeding (prevents unique index errors)
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
    console.warn("[DB] Roles dedup skipped:", cleanErr.message);
  }

  await seedRoles();
  await seedMenus();
  console.log("[DB] Database ready.");
}

// =============================================================================
// SERVER BOOTSTRAP
// =============================================================================
async function startServer() {
  try {
    await initDatabase();

    // Connect Redis — optional, never crashes the server
    try {
      await redisClient.connect();
      console.log("[Redis] Connected.");
    } catch (redisErr: any) {
      console.warn("[Redis] Failed to connect. Caching disabled:", redisErr.message);
    }

    // Verify email — async, does not block startup
    EmailService.verifyConnection().catch((err) => {
      console.warn("[Email] SMTP verification failed:", err?.message || err);
    });

    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || "0.0.0.0";

    const server = http.createServer(app);

    // Initialize Socket.IO after HTTP server
    initializeSocket(server);

    server.listen(port, host, () => {
      console.log("[Server] Started successfully");
      console.log(`   URL:     http://localhost:${port}`);
      console.log(`   Swagger: http://localhost:${port}/pjsv`);
      console.log(`   Health:  http://localhost:${port}/health`);
      console.log(`   Env:     ${process.env.NODE_ENV || "development"}`);

      // Start attendance background cron jobs
      startAttendanceCron();
    });

    // Graceful shutdown — called by Render when deploying new version or restarting
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("[Shutdown] HTTP server closed. No new connections accepted.");

        try {
          if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log("[Shutdown] Database connection pool closed.");
          }
        } catch (err: any) {
          console.error("[Shutdown] Error closing DB:", err.message);
        }

        try {
          if (redisClient.isReady) {
            await redisClient.quit();
            console.log("[Shutdown] Redis connection closed.");
          }
        } catch (err: any) {
          console.error("[Shutdown] Error closing Redis:", err.message);
        }

        console.log("[Shutdown] Graceful shutdown complete.");
        process.exit(0);
      });

      // Force-exit if shutdown takes too long (Render gives 10s before SIGKILL)
      setTimeout(() => {
        console.error("[Shutdown] Timed out. Force exiting.");
        process.exit(1);
      }, 9000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

  } catch (err: any) {
    console.error("[Startup] Server failed to start:", err.message || err);
    process.exit(1);
  }
}

startServer();

export { dataSource };
