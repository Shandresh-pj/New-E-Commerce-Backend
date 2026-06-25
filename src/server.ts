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
import { seedRoles } from "./utils/seeds/role.seed";

/* ================= DB ================= */
export const dataSource = new DataSource(Global.dbConfig);

/* ================= INIT DB ================= */
async function initDatabase(retries = 3) {
  while (retries > 0) {
    try {
      await dataSource.initialize();
      await seedRoles();

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
// dataSource.initialize().then(async()=>{console.log("Database connected");
// await seedRoles();})
// .catch(error=>{console.log(error);});

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
    initializeSocket(server);

    /* ================= LISTEN ================= */
    server.listen(port, host, () => {
      console.log("================================");
      console.log("🚀 Server Started Successfully");
      console.log("================================");
      console.log(`📍 URL      : ${appUrl}`);
      console.log(`📘 Swagger  : ${appUrl}/pjsv`);
      console.log(`⚙️ Mode     : ${process.env.NODE_ENV || "development"}`);
      console.log("Aaaaaaaa-0",process.env.EMAIL_USER);
      console.log("Aaaaaaaa-1",process.env.EMAIL_PASS);
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