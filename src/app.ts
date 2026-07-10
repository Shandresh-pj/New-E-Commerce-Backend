import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";

import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger";
import { timezoneMiddleware } from "./middleware/timezone";
import errorHandler from "./middleware/errorHandler";
import logger from "./utils/logger";
import { preventDuplicateCalls } from "./middleware/preventDuplicateCalls";
import { writeFileSync } from "fs";
import { resolve } from "path";
import dataSource from "./config/database";

const app = express();

/* ================= SECURITY & CORS ================= */

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/* ================= PERFORMANCE & PARSING ================= */

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again in a few minutes.",
      });
    },
  })
);

/* ================= REQUEST LOGGER ================= */

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
  });

  next();
});

/* ================= CUSTOM MIDDLEWARE ================= */

app.use(preventDuplicateCalls);
app.use(timezoneMiddleware);

/* ================= SWAGGER ================= */

app.use("/pjsv", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ================= ROUTE LOADER ================= */

const loadRoutes = (dir: string) => {
  if (!fs.existsSync(dir)) {
    console.error("Routes directory not found:", dir);
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadRoutes(fullPath);
      continue;
    }

    if (!file.endsWith("Routes.ts") && !file.endsWith("Routes.js")) continue;

    try {
      const route = require(fullPath).default;

      if (route) {
        app.use("/api", route);
        console.log("Loaded Route:", file);
      }

    } catch (err) {
      console.error("Route Load Error:", file, err);
    }
  }
};

loadRoutes(path.join(__dirname, "routes"));

/* ================= HEALTH CHECK ================= */

app.get("/health", async (req, res) => {
  try {
    const dbConnected = dataSource.isInitialized;
    let dbTest = "SKIPPED";
    if (dbConnected) {
      await dataSource.query("SELECT 1");
      dbTest = "SUCCESS";
    }
    res.json({
      status: "UP",
      database: dbConnected ? "CONNECTED" : "DISCONNECTED",
      dbQuery: dbTest,
      time: new Date()
    });
  } catch (err: any) {
    res.json({
      status: "UP",
      database: "ERROR",
      error: err.message,
      time: new Date()
    });
  }
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

export default app;