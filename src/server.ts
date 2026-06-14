import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import os from "os";
import { DataSource } from "typeorm";

import app from "./app";
import { Global } from "../global";

export const dataSource = new DataSource(
  Global.dbConfig
);

/* ==========================================
   GET LOCAL IP
========================================== */

function getLocalIP(): string {

  const interfaces =
    os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {

    const network =
      interfaces[name];

    if (!network) continue;

    for (const net of network) {

      if (
        net.family === "IPv4" &&
        !net.internal
      ) {
        return net.address;
      }
    }
  }

  return "localhost";
}

/* ==========================================
   START SERVER
========================================== */

async function startServer() {

  try {

    await dataSource.initialize();

    console.log("================================");
    console.log("✅ Database Connected");
    console.log("================================");

    console.log(
      "Entities:",
      dataSource.entityMetadatas.map(
        (e) => ({
          name: e.name,
          table: e.tableName,
        })
      )
    );

    const port = Number(
      process.env.PORT || 3000
    );

    const localIP = getLocalIP();

    app.listen(
      port,
      "0.0.0.0",
      () => {

        console.log(
          "================================"
        );

        console.log(
          `🚀 Server Started on Port ${port}`
        );

        console.log(
          `🌐 Local    : http://localhost:${port}`
        );

        console.log(
          `🌐 Network  : http://${localIP}:${port}`
        );

        console.log(
          `📄 Swagger  : http://localhost:${port}/pjsv`
        );

        console.log(
          `📄 Swagger  : http://${localIP}:${port}/pjsv`
        );

        console.log(
          "================================"
        );
      }
    );

  } catch (error) {

    console.error(
      "❌ Server Startup Failed",
      error
    );

    process.exit(1);
  }
}

/* ==========================================
   PROCESS EVENTS
========================================== */

process.on(
  "unhandledRejection",
  (reason) => {

    console.error(
      "Unhandled Rejection:",
      reason
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {

    console.error(
      "Uncaught Exception:",
      error
    );
  }
);

process.on(
  "SIGINT",
  async () => {

    console.log(
      "\n🛑 Shutting down server..."
    );

    try {

      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }

      console.log(
        "✅ Database Connection Closed"
      );

    } catch (error) {

      console.error(
        "Error while closing database:",
        error
      );
    }

    process.exit(0);
  }
);

startServer();

export default dataSource;