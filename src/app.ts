import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";

import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
const hpp = require("hpp");
import { xssSanitizer } from "./middleware/xssSanitizer";

import { swaggerSpec } from "./config/swagger";
import { timezoneMiddleware } from "./middleware/timezone";
import errorHandler from "./middleware/errorHandler";
import logger from "./utils/logger";
import { preventDuplicateCalls } from "./middleware/preventDuplicateCalls";
import dataSource from "./config/database";
import { redisClient } from "./config/redis";
import { smtpStatus } from "./services/email.Provider";

const app = express();

/* ================= SECURITY & CORS ================= */

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false, // Swagger and custom frontends might load inline scripts/assets
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(hpp());
app.use(xssSanitizer);



// Trust proxy is required when running behind a load balancer or proxy (like Render, Heroku, AWS)
app.set("trust proxy", 1);

// CORS: lock to specific origins in production, open in development
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:4200"
).split(",").map((o) => o.trim());

app.use(
  cors({
    origin: isProd
      ? (origin, callback) => {
          // Allow server-to-server calls (no origin) and whitelisted origins
          // or allow all if allowedOrigins includes '*'
          if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            callback(null, true);
          } else {
            // Using callback(null, false) instead of Error prevents a 500 Internal Server Error.
            // The browser will handle the CORS block naturally.
            callback(null, false);
          }
        }
      : true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["X-Cache", "X-Total-Count"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Handle OPTIONS preflight requests explicitly
app.options("*", cors());

/* ================= PERFORMANCE & PARSING ================= */

app.use(compression());

// ─── Raw Body Capture for Razorpay Webhooks ──────────────────────────────
// express.json() parses the body and discards the raw bytes. Razorpay HMAC
// verification REQUIRES the exact raw bytes, so we capture them here BEFORE
// express.json() processes them, and attach to req.rawBody.
app.use((req: any, res: any, next: any) => {
  if (req.url.includes('/webhook') || req.url.includes('/razorpay/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", (req, res, next) => {
  const cleanPath = req.path.replace(/^\/+/, "");
  if (!cleanPath.startsWith("images/") && !cleanPath.startsWith("videos/") && !cleanPath.startsWith("audios/") && !cleanPath.startsWith("documents/")) {
    const imgPath = path.join(process.cwd(), "uploads", "images", cleanPath);
    if (fs.existsSync(imgPath) && fs.statSync(imgPath).isFile()) {
      req.url = `/images/${cleanPath}`;
    }
  }
  next();
}, express.static(path.join(process.cwd(), "uploads")));

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

import { redisCache } from "./middleware/redisCache";

/* ================= SWAGGER ================= */

app.use("/pjsv", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ================= ROUTE LOADER ================= */

// Apply redis cache to all API routes
app.use("/api", redisCache(60));

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

    if (!file.toLowerCase().endsWith("routes.ts") && !file.toLowerCase().endsWith("routes.js")) continue;

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
      dbTest = "OK";
    }

    res.json({
      status: "UP",
      uptime: `${Math.floor(process.uptime())}s`,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? `CONNECTED (${dbTest})` : "DISCONNECTED",
        redis: redisClient.isReady ? "CONNECTED" : "UNAVAILABLE (non-fatal)",
        smtp: smtpStatus === "ok" ? "VERIFIED" : smtpStatus === "failed" ? "UNAVAILABLE" : "UNCHECKED",
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: "DEGRADED",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

export default app;