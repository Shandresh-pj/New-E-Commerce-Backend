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

import { redisClient } from "./config/redis";

async function startServer() {
  try {
    await initDatabase();
    
    // Connect to Redis (v4+ requires explicit connection)
    try {
      await redisClient.connect();
      console.log("✅ Redis Connected");
    } catch (redisErr: any) {
      console.warn("⚠️ Redis failed to connect. Caching will be disabled:", redisErr.message);
    }

    EmailService.verifyConnection(); // Run asynchronously so it doesn't block Render startup


    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || "0.0.0.0";

    const server = http.createServer(app);

    // socket AFTER http server
    initializeSocket(server);

    server.listen(port, host, () => {
      console.log("🚀 Server Started");
      console.log(`http://localhost:${port}`);
      console.log(`Swagger: http://localhost:${port}/pjsv`);

      // Start attendance background cron jobs
      startAttendanceCron();
    });

  } catch (err) {
    console.error("❌ Startup failed", err);
    process.exit(1);
  }
}

startServer();

export { dataSource };