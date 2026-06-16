import "dotenv/config";
import "reflect-metadata";

import express from "express";
import fs from "fs";
import path from "path";

import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { swaggerSpec, swaggerUi } from "./config/swagger";
import { timezoneMiddleware } from "./middleware/timezone";
import { preventDuplicateCalls } from "./middleware/preventDuplicatecalls";
import errorHandler from "./middleware/errorHandler";
import authenticateMiddleware from "./middleware/authenticate";
import logger from "./utils/logger";
import { responseFormatter } from "./middleware/responseFormatter";

// Routes that must remain reachable without a bearer token
const PUBLIC_API_ROUTES = [
  "/auth/register",
  "/auth/login",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/password/send-otp",
  "/password/verify-otp",
  "/password/reset",
];

const app = express();

/* ==========================================
   SECURITY
========================================== */

app.disable("x-powered-by");

// app.use(helmet());

app.use(compression());

app.use(timezoneMiddleware);
app.use(responseFormatter);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* ==========================================
   RATE LIMIT
========================================== */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ==========================================
   BODY PARSER
========================================== */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* ==========================================
   CUSTOM MIDDLEWARE
========================================== */

app.use(preventDuplicateCalls);

app.use(timezoneMiddleware);

/* ==========================================
   STATIC FILES
========================================== */

// Allow cross-origin access to all uploaded media (images, videos, etc.)
const setCORP = (_req: any, res: any, next: any) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
};

// Serve organised subfolders (new uploads)
app.use("/uploads", setCORP, express.static(path.join(process.cwd(), "uploads")));

// Backwards-compat: old files saved flat in ./uploads/ are
// reachable at /uploads/images/* and /uploads/videos/* too
app.use("/uploads/images", setCORP, express.static(path.join(process.cwd(), "uploads")));
app.use("/uploads/videos", setCORP, express.static(path.join(process.cwd(), "uploads")));

/* ==========================================
   CACHE CONTROL
========================================== */

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  next();
}); 

/* ==========================================
   REQUEST LOGGER
========================================== */

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
});

/* ==========================================
   SWAGGER
========================================== */

app.use(
  "/pjsv",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

/* ==========================================
   AUTHENTICATION GATE
   Every /api route requires a valid, non-expired
   bearer token except the public auth routes above.
========================================== */

app.use("/api", (req, res, next) => {
  if (PUBLIC_API_ROUTES.includes(req.path)) {
    return next();
  }

  return authenticateMiddleware(req, res, next);
});

/* ==========================================
   DYNAMIC ROUTE LOADER
========================================== */

const loadRoutes = (
  directory: string
): void => {

  if (!fs.existsSync(directory)) {

    console.error(
      `Routes directory not found: ${directory}`
    );

    return;
  }

  const files =
    fs.readdirSync(directory);

  files.forEach((file) => {

    const fullPath =
      path.join(directory, file);

    try {

      const stat =
        fs.statSync(fullPath);

      if (stat.isDirectory()) {

        loadRoutes(fullPath);

        return;
      }

      const isRouteFile =
        file.endsWith("Routes.ts") ||
        file.endsWith("Routes.js");

      if (!isRouteFile) {
        return;
      }

      console.log(
        `Loading Route File: ${fullPath}`
      );

      const routeModule =
        require(fullPath);

      const router =
        routeModule.default ||
        routeModule;

      if (!router) {

        console.error(
          `Invalid router export in ${file}`
        );

        return;
      }

      app.use("/api", router);

      console.log(
        `Route Loaded Successfully: ${file}`
      );

      logger.info(
        `Route Loaded: ${file}`
      );

    } catch (error) {

      console.error(
        `Failed to load route ${fullPath}`,
        error
      );

    }

  });

};

/* ==========================================
   LOAD ROUTES
========================================== */

const routesPath =
  path.join(__dirname, "routes");

console.log(
  "Routes Directory:",
  routesPath
);

loadRoutes(routesPath);

/* ==========================================
   ROOT ROUTE
========================================== */

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "API Running Successfully",
  });

});

/* ==========================================
   HEALTH CHECK
========================================== */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    status: "UP",
    timestamp: new Date(),
  });

});

/* ==========================================
   ROUTE NOT FOUND
========================================== */

app.use((req, res) => {

  console.error(
    `Route Not Found => ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: "Route Not Found",
    path: req.originalUrl,
    method: req.method,
  });

});

/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

app.use(errorHandler);

/* ==========================================
   STARTUP LOG
========================================== */

console.log(
  "Application Initialized Successfully"
);

logger.info(
  "Application Initialized Successfully"
);

export default app;