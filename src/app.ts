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
import logger from "./utils/logger";
import { responseFormatter } from "./middleware/responseFormatter";

const app = express();

/* ==========================================
   SECURITY
========================================== */

app.disable("x-powered-by");

<<<<<<< HEAD
// app.use(helmet());
=======
app.use(
  helmet({
    hsts: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
>>>>>>> c9de75034e8231d0a07326c395490045e45388e8

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

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);

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