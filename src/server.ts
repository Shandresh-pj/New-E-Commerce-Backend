import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";

import { DataSource } from "typeorm";
import { Global } from "../global";

import { initializeSocket } from "./socket/socket";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

/* ================= DB ================= */
export const dataSource = new DataSource(Global.dbConfig);

/* ================= INIT DB ================= */
async function initDatabase(retries = 3) {
  while (retries > 0) {
    try {
      await dataSource.initialize();

      console.log("================================");
      console.log("✅ Database Connected");
      console.log("================================");

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
    const host = process.env.HOST || "0.0.0.0";
    const appUrl = process.env.APP_URL || `http://localhost:${port}`;

    const server = http.createServer(app);

    /* ================= SWAGGER ================= */
    app.use(
      "/pjsv",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec)
    );

    /* ================= SOCKET ================= */
    initializeSocket(server, async () => null);

    /* ================= LISTEN ================= */
    server.listen(port, host, () => {
      console.log("================================");
      console.log("🚀 Server Started Successfully");
      console.log("================================");
      console.log(`📍 URL      : ${appUrl}`);
      console.log(`📘 Swagger  : ${appUrl}/pjsv`);
      console.log(`⚙️ Mode     : ${process.env.NODE_ENV || "development"}`);
      console.log("================================");
    });

    server.on("error", (err) => {
      console.error("❌ Server Error:", err);
    });

  } catch (error) {
    console.error("❌ Server Startup Failed:", error);
    process.exit(1);
  }
}

startServer();

export default dataSource;