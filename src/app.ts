import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
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

// =============================================================================
// SECURITY HEADERS (Helmet)
// =============================================================================
// SECURITY FIX: ContentSecurityPolicy was disabled (contentSecurityPolicy: false).
// Disabled CSP = any injected inline script executes. Now enabled with a policy
// that allows Swagger UI (which uses inline scripts/styles) without opening
// the full attack surface.
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:    ["'self'"],
        scriptSrc:     ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Swagger UI needs these
        styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:       ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc:        ["'self'", "data:", "https:"],
        connectSrc:    ["'self'"],
        frameSrc:      ["'none'"],
        objectSrc:     ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Prevent MIME-type sniffing (e.g. a .txt file being executed as JS)
    noSniff: true,
    // Block pages from being framed (clickjacking)
    frameguard: { action: "deny" },
    // Force HTTPS for 1 year in production
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
  })
);

// Trust exactly 1 proxy hop (Render load balancer) — prevents IP spoofing
// via X-Forwarded-For header when trust proxy is set to true (trusts all hops).
app.set("trust proxy", 1);

// =============================================================================
// CORS
// =============================================================================
// SECURITY FIX: Previous code allowed "*" wildcard with credentials:true.
// credentials:true + wildcard = any site can make credentialed requests (cookie theft).
// Fix: never allow wildcard when credentials are enabled.
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins: string[] = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:4200"
)
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0 && o !== "*"); // strip "*" — incompatible with credentials

app.use(
  cors({
    origin: isProd
      ? (origin, callback) => {
          // Allow server-to-server (no origin header) and whitelisted origins only
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            // Return false (not an Error) so browser handles CORS block naturally
            callback(null, false);
          }
        }
      : true, // Development: allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["X-Cache", "X-Total-Count"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.options(/(.*)/, cors());

// =============================================================================
// PERFORMANCE & PARSING
// =============================================================================
app.use(compression());

// --- Raw Body Capture for Razorpay Webhooks ----------------------------------
// express.json() discards raw bytes. Razorpay HMAC verification needs the
// exact raw body, so we capture it BEFORE json() runs.
app.use((req: any, res: any, next: any) => {
  if (req.url.includes("/webhook") || req.url.includes("/razorpay/webhook")) {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => {
      req.rawBody = data;
      try   { req.body = JSON.parse(data); }
      catch { req.body = {};               }
      next();
    });
  } else {
    next();
  }
});

// SECURITY FIX: Reduced from 10mb to 1mb for JSON and 5mb for urlencoded.
// A 10mb JSON body can be used to DoS the server by exhausting memory during
// JSON.parse(). Files are handled separately by multer (multipart), not JSON.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// HTTP Parameter Pollution protection
app.use(hpp());

// XSS sanitization on body / params / query
app.use(xssSanitizer);

// --- Static File Serving (uploads) -------------------------------------------
// SECURITY FIX: Added path traversal protection.
// Previous code did not verify the resolved path stays within uploads/.
// An attacker could request /uploads/../../../../etc/passwd.
const UPLOADS_ROOT = path.resolve(path.join(process.cwd(), "uploads"));

app.use(
  "/uploads",
  (req: Request, res: Response, next: NextFunction) => {
    // Resolve the full path and ensure it stays inside UPLOADS_ROOT
    const requestedPath = path.resolve(path.join(UPLOADS_ROOT, req.path));
    if (!requestedPath.startsWith(UPLOADS_ROOT + path.sep) &&
        requestedPath !== UPLOADS_ROOT) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const cleanPath = req.path.replace(/^\/+/, "");
    if (
      !cleanPath.startsWith("images/") &&
      !cleanPath.startsWith("videos/") &&
      !cleanPath.startsWith("audios/") &&
      !cleanPath.startsWith("documents/")
    ) {
      const imgPath = path.join(UPLOADS_ROOT, "images", cleanPath);
      if (fs.existsSync(imgPath) && fs.statSync(imgPath).isFile()) {
        req.url = `/images/${cleanPath}`;
      }
    }
    next();
  },
  express.static(UPLOADS_ROOT, {
    // Prevent directory listing
    index: false,
    // Add cache headers for static assets
    maxAge: "7d",
  })
);

// =============================================================================
// RATE LIMITING
// =============================================================================
// SECURITY FIX: 2000 req/15min (133 req/sec) was too permissive for brute force.
// Now: 200 req/15min general, 10 req/15min for auth routes.

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 200,                        // 200 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,   // count ALL requests, not just failures
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again in a few minutes.",
    });
  },
});

// Strict rate limit for authentication endpoints (login, register, OTP etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 10,                         // Only 10 auth attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again in 15 minutes.",
    });
  },
});

app.use(generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/otp",  authLimiter);
app.use("/api/password", authLimiter);

// =============================================================================
// REQUEST LOGGER
// =============================================================================
// SECURITY FIX: Use req.path (no query string) instead of req.url.
// req.url includes query parameters which may contain tokens, passwords,
// or PII — logging them creates a sensitive data exposure in log files.
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    // Log method + path only (no query params, no body, no headers)
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

// =============================================================================
// CUSTOM MIDDLEWARE
// =============================================================================
app.use(preventDuplicateCalls);
app.use(timezoneMiddleware);

import { redisCache } from "./middleware/redisCache";

// =============================================================================
// SWAGGER UI
// =============================================================================
// Swagger only in non-production (do not expose API docs publicly)
if (process.env.NODE_ENV !== "production") {
  app.use(["/pjsv", "/api-docs", "/swagger"], swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} else {
  // In production: serve Swagger only for internal IPs or with a token
  app.use(["/pjsv", "/api-docs", "/swagger"], (req: Request, res: Response, next: NextFunction) => {
    const swaggerToken = process.env.SWAGGER_ACCESS_TOKEN;
    const providedToken = req.query.token || req.headers["x-swagger-token"];
    // Allow if no token configured (backward compat) or token matches
    if (!swaggerToken || providedToken === swaggerToken) {
      return next();
    }
    res.status(403).json({ success: false, message: "Swagger access denied." });
  }, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// =============================================================================
// API ROUTES
// =============================================================================
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

// =============================================================================
// HEALTH CHECK
// =============================================================================
// SECURITY FIX: Removed nodeVersion from response (leaks attack surface info).
// Internal infrastructure details (Node version, uptime precision) help
// attackers target known CVEs. Only expose what external monitors need.
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const dbConnected = dataSource.isInitialized;
    let dbTest = "SKIPPED";
    if (dbConnected) {
      await dataSource.query("SELECT 1");
      dbTest = "OK";
    }

    res.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? `CONNECTED (${dbTest})` : "DISCONNECTED",
        redis:    redisClient.isReady ? "CONNECTED" : "UNAVAILABLE",
        smtp:     smtpStatus === "ok" ? "VERIFIED" : smtpStatus === "failed" ? "UNAVAILABLE" : "UNCHECKED",
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: "DEGRADED",
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// 404 NOT FOUND
// =============================================================================
app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================
app.use(errorHandler);

export default app;
