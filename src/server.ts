import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { initializeSocket } from "./socket/socket";
import { seedRoles } from "./utils/seeds/role.seed";
import dataSource from "./config/database";
import { startAttendanceCron } from "./utils/attendance.cron";

async function initDatabase() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await seedRoles();
  console.log("✅ Database Connected");
}

async function startServer() {
  try {
    await initDatabase();

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