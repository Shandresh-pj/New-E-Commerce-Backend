import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import os from "os";
import http from "http";
import app from "./app";
import { DataSource } from "typeorm";
import { Global } from "../global";
import { initializeSocket } from "./socket/socket";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

export const dataSource = new DataSource(Global.dbConfig);

/* ================= GET LOCAL IP ================= */
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const network = interfaces[name];
    if (!network) continue;

    for (const net of network) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

/* ================= DB INIT ================= */
async function initDatabase(retries = 3) {
  while (retries > 0) {
    try {
      await dataSource.initialize();
      console.log("✅ Database Connected");
      return;
    } catch (error) {
      retries--;
      console.error("❌ DB Failed. Retries left:", retries);
      if (retries === 0) throw error;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

/* ================= START SERVER ================= */
async function startServer() {
  try {
    await initDatabase();

    const port = Number(process.env.PORT || 3000);
    const localIP = getLocalIP();

    const server = http.createServer(app);

    /* ================= SWAGGER (IMPORTANT) ================= */
    app.use("/pjsv", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    /* ================= SOCKET ================= */
    initializeSocket(server, async () => null);

    server.listen(port, "0.0.0.0", () => {
      console.log("================================");
      console.log(`🚀 Server: http://localhost:${port}`);
      console.log(`🌐 Network: http://${localIP}:${port}`);
      console.log(`📘 Swagger: http://localhost:${port}/pjsv`);
      console.log("================================");
    });

  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

startServer();

export default dataSource;