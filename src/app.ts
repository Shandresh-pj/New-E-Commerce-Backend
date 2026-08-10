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

// Handle OPTIONS preflight requests explicitly (compatible with path-to-regexp v6+)
app.options(/(.*)/, cors());

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

/* ================= SWAGGER CUSTOM THEME & ROUTES ================= */

const customSwaggerCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg-main: #07090f;
    --bg-card: rgba(15, 23, 42, 0.80);
    --bg-card-hover: rgba(30, 41, 59, 0.90);
    --bg-input: #0f172a;
    --border: rgba(148, 163, 184, 0.10);
    --border-focus: rgba(56, 189, 248, 0.5);
    --text-1: #f1f5f9;
    --text-2: #94a3b8;
    --text-3: #64748b;
    --em: #38bdf8;
    --green: #10b981;
    --blue: #3b82f6;
    --amber: #f59e0b;
    --red: #ef4444;
    --violet: #8b5cf6;
    --pink: #ec4899;
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
  }

  /* === GLOBAL RESET === */
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0; padding: 0;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.15) transparent;
  }

  body, .swagger-ui {
    background-color: var(--bg-main) !important;
    color: var(--text-1) !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 14px !important;
    line-height: 1.6 !important;
  }

  /* === SCROLLBAR === */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

  /* === TOPBAR / HEADER === */
  .swagger-ui .topbar {
    background: linear-gradient(135deg, #0a0f1e 0%, #0f1b3d 50%, #1a1040 100%) !important;
    border-bottom: 1px solid rgba(99, 102, 241, 0.25);
    padding: 0 !important;
    min-height: 60px;
    display: flex !important;
    align-items: center !important;
    box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.6);
  }

  .swagger-ui .topbar .wrapper {
    display: flex;
    align-items: center;
    padding: 0 24px;
    width: 100%;
  }

  .swagger-ui .topbar a {
    max-width: none !important;
    padding: 0 !important;
  }

  .swagger-ui .topbar .topbar-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
    flex: 1;
  }

  .swagger-ui .topbar .topbar-wrapper a span {
    color: transparent !important;
    font-weight: 900 !important;
    font-size: 1.1rem !important;
    letter-spacing: -0.3px;
    background: linear-gradient(90deg, #818cf8, #38bdf8, #10b981);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradientShift 4s ease infinite;
  }

  @keyframes gradientShift {
    0% { background-position: 0% center; }
    50% { background-position: 100% center; }
    100% { background-position: 0% center; }
  }

  /* Status dot in topbar */
  .swagger-ui .topbar .topbar-wrapper::before {
    content: '';
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 3px rgba(16,185,129,0.2), 0 0 12px rgba(16,185,129,0.4);
    animation: pulse 2s ease infinite;
    flex-shrink: 0;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2), 0 0 12px rgba(16,185,129,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(16,185,129,0.1), 0 0 20px rgba(16,185,129,0.3); }
  }

  .swagger-ui .download-url-wrapper { display: none !important; }

  /* === MAIN CONTENT WRAPPER === */
  .swagger-ui .wrapper {
    max-width: 1400px !important;
    padding: 0 24px !important;
  }

  /* === INFO BLOCK === */
  .swagger-ui .info {
    margin: 28px 0 !important;
    background: linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(20,14,60,0.7) 100%) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: var(--radius-lg) !important;
    padding: 32px 36px !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07);
    position: relative;
    overflow: hidden;
  }

  .swagger-ui .info::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #38bdf8, #10b981, #f59e0b);
    background-size: 200% auto;
    animation: gradientShift 4s ease infinite;
  }

  .swagger-ui .info .title {
    color: #f8fafc !important;
    font-size: 2rem !important;
    font-weight: 900 !important;
    letter-spacing: -1px;
    line-height: 1.2;
    margin-bottom: 10px;
  }

  .swagger-ui .info p,
  .swagger-ui .info li,
  .swagger-ui .info a {
    color: var(--text-2) !important;
    font-size: 0.9rem !important;
  }

  .swagger-ui .info a {
    color: var(--em) !important;
    text-decoration: none;
    border-bottom: 1px solid rgba(56,189,248,0.3);
  }

  .swagger-ui .info .base-url {
    color: var(--text-3) !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.8rem !important;
    background: rgba(0,0,0,0.3);
    padding: 3px 10px;
    border-radius: 99px;
    display: inline-block;
    margin-top: 8px;
  }

  /* Version badge */
  .swagger-ui .info hgroup .version {
    background: linear-gradient(135deg, #1e1b4b, #312e81) !important;
    color: #a5b4fc !important;
    border: 1px solid rgba(99,102,241,0.4) !important;
    padding: 3px 10px !important;
    border-radius: 99px !important;
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.5px;
  }

  /* === SERVERS / AUTH CONTAINER === */
  .swagger-ui .scheme-container {
    background: rgba(15,23,42,0.7) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: none !important;
    padding: 18px 24px !important;
    margin-bottom: 28px !important;
    backdrop-filter: blur(12px);
  }

  /* === AUTHORIZE BUTTON === */
  .swagger-ui .auth-wrapper .btn.authorize {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
    border: none !important;
    color: #ffffff !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 700 !important;
    font-size: 0.85rem !important;
    padding: 9px 22px !important;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(16,185,129,0.35), 0 0 0 1px rgba(16,185,129,0.15) !important;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }

  .swagger-ui .auth-wrapper .btn.authorize:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 20px rgba(16,185,129,0.45), 0 0 0 1px rgba(16,185,129,0.25) !important;
  }

  .swagger-ui .auth-wrapper .btn.authorize svg {
    fill: #fff !important;
  }

  .swagger-ui .auth-btn-wrapper .btn-done {
    background: var(--blue) !important;
    color: #fff !important;
    border: none !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 700 !important;
  }

  /* === TAG SECTIONS === */
  .swagger-ui .opblock-tag-section {
    margin-bottom: 8px;
  }

  .swagger-ui .opblock-tag {
    color: var(--text-1) !important;
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 14px 4px !important;
    margin-top: 16px !important;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: color 0.2s ease;
  }

  .swagger-ui .opblock-tag:hover {
    color: var(--em) !important;
  }

  .swagger-ui .opblock-tag small {
    color: var(--text-3) !important;
    font-size: 0.78rem !important;
    font-weight: 400;
    margin-left: 8px;
  }

  /* === OPERATION BLOCKS === */
  .swagger-ui .opblock {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25) !important;
    margin-bottom: 12px !important;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    backdrop-filter: blur(8px);
  }

  .swagger-ui .opblock:hover {
    border-color: rgba(148,163,184,0.2) !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35) !important;
  }

  .swagger-ui .opblock.is-open {
    border-color: rgba(56,189,248,0.25) !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(56,189,248,0.1) !important;
  }

  .swagger-ui .opblock .opblock-summary {
    padding: 14px 20px !important;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .swagger-ui .opblock .opblock-summary:hover {
    background: rgba(255,255,255,0.03) !important;
  }

  /* === HTTP METHOD BADGES === */
  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 6px !important;
    font-weight: 800 !important;
    font-size: 0.73rem !important;
    min-width: 80px !important;
    height: 28px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-shadow: none !important;
    letter-spacing: 0.8px;
    font-family: 'Inter', sans-serif !important;
  }

  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: linear-gradient(135deg, #047857 0%, #10b981 100%) !important;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%) !important;
  }
  .swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%) !important;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%) !important;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%) !important;
  }

  /* Opblock accent left border */
  .swagger-ui .opblock.opblock-get    { border-left: 3px solid #10b981 !important; }
  .swagger-ui .opblock.opblock-post   { border-left: 3px solid #3b82f6 !important; }
  .swagger-ui .opblock.opblock-put    { border-left: 3px solid #f59e0b !important; }
  .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }
  .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #8b5cf6 !important; }

  .swagger-ui .opblock .opblock-summary-path {
    color: #e2e8f0 !important;
    font-weight: 600 !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.88rem !important;
  }

  .swagger-ui .opblock .opblock-summary-path__deprecated {
    text-decoration: line-through;
    color: var(--text-3) !important;
  }

  .swagger-ui .opblock .opblock-summary-description {
    color: var(--text-2) !important;
    font-size: 0.82rem !important;
    font-style: italic;
  }

  /* Lock icon (auth indicator) */
  .swagger-ui .opblock .opblock-summary-path .authorization__btn {
    opacity: 0.5 !important;
  }

  /* === OPBLOCK BODY (EXPANDED) === */
  .swagger-ui .opblock-body {
    background: linear-gradient(135deg, #070c18 0%, #0b1225 100%) !important;
    padding: 0 !important;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .swagger-ui .opblock-description-wrapper {
    padding: 16px 20px !important;
  }

  .swagger-ui .opblock-description-wrapper p {
    color: var(--text-2) !important;
    font-size: 0.88rem !important;
    line-height: 1.7;
  }

  .swagger-ui .opblock-description-wrapper code,
  .swagger-ui .opblock-section-header code {
    background: rgba(56,189,248,0.1) !important;
    color: #38bdf8 !important;
    padding: 1px 6px !important;
    border-radius: 4px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.82rem !important;
  }

  /* === PARAMETERS TABLE === */
  .swagger-ui .opblock-section-header {
    background: rgba(0,0,0,0.25) !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 12px 20px !important;
  }

  .swagger-ui .opblock-section-header label,
  .swagger-ui .opblock-section-header h4 {
    color: var(--text-2) !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .swagger-ui .parameters-container,
  .swagger-ui .table-container {
    padding: 16px 20px !important;
  }

  .swagger-ui table.parameters thead tr td,
  .swagger-ui table.parameters thead tr th {
    color: var(--text-3) !important;
    font-size: 0.75rem !important;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 6px 10px !important;
    border-bottom: 1px solid var(--border) !important;
  }

  .swagger-ui table.parameters tbody tr td {
    padding: 12px 10px !important;
    border-bottom: 1px solid rgba(255,255,255,0.04) !important;
    vertical-align: top;
  }

  .swagger-ui table.parameters,
  .swagger-ui table.responses-table {
    color: var(--text-1) !important;
    background: transparent !important;
    border-collapse: collapse;
  }

  /* === PARAMETER NAMES === */
  .swagger-ui .parameter__name {
    color: #7dd3fc !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 600 !important;
    font-size: 0.88rem !important;
  }

  /* REQUIRED badge */
  .swagger-ui .parameter__name.required:after {
    content: 'REQUIRED' !important;
    display: inline-flex;
    align-items: center;
    color: #fff !important;
    background: linear-gradient(135deg, #b91c1c, #ef4444) !important;
    font-size: 0.6rem !important;
    font-weight: 800 !important;
    font-family: 'Inter', sans-serif !important;
    letter-spacing: 0.8px;
    padding: 2px 7px !important;
    border-radius: 99px !important;
    margin-left: 8px !important;
    vertical-align: middle;
    text-transform: uppercase;
    box-shadow: 0 2px 6px rgba(239,68,68,0.3);
  }

  /* optional indicator */
  .swagger-ui .parameter__name:not(.required)::after {
    content: 'optional';
    color: var(--text-3);
    font-size: 0.65rem;
    font-family: 'Inter', sans-serif !important;
    font-weight: 400;
    font-style: italic;
    margin-left: 6px;
    opacity: 0.7;
  }

  .swagger-ui .parameter__type {
    color: #86efac !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.78rem !important;
  }

  .swagger-ui .parameter__in {
    color: var(--text-3) !important;
    font-size: 0.72rem !important;
    font-style: italic;
  }

  .swagger-ui .parameter__deprecated {
    color: var(--red) !important;
    font-size: 0.72rem !important;
  }

  .swagger-ui .parameter__extension {
    color: var(--text-3) !important;
  }

  /* === INPUTS & TEXTAREAS === */
  .swagger-ui input[type=text],
  .swagger-ui input[type=password],
  .swagger-ui input[type=email],
  .swagger-ui input[type=number],
  .swagger-ui textarea,
  .swagger-ui select {
    background: var(--bg-input) !important;
    border: 1px solid rgba(148,163,184,0.15) !important;
    color: #f1f5f9 !important;
    border-radius: var(--radius-sm) !important;
    padding: 8px 12px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.85rem !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    width: 100%;
  }

  .swagger-ui input[type=text]:focus,
  .swagger-ui input[type=password]:focus,
  .swagger-ui textarea:focus,
  .swagger-ui select:focus {
    border-color: var(--border-focus) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15) !important;
  }

  .swagger-ui input[type=checkbox] {
    accent-color: var(--em);
  }

  /* === REQUEST BODY / CODE AREA === */
  .swagger-ui .body-param textarea {
    min-height: 150px;
  }

  .swagger-ui .highlight-code pre,
  .swagger-ui .model-box {
    background: #060a14 !important;
    border-radius: var(--radius-sm) !important;
    border: 1px solid var(--border) !important;
    padding: 14px !important;
  }

  .swagger-ui .model {
    color: #e2e8f0 !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.82rem !important;
    line-height: 1.8;
  }

  .swagger-ui .model-title {
    color: var(--em) !important;
    font-weight: 700 !important;
    font-family: 'Inter', sans-serif !important;
  }

  .swagger-ui .model-title__text {
    color: #7dd3fc !important;
  }

  .swagger-ui span.prop-type {
    color: #86efac !important;
    font-family: 'JetBrains Mono', monospace !important;
  }

  .swagger-ui span.prop-format {
    color: var(--text-3) !important;
    font-size: 0.75rem !important;
  }

  .swagger-ui .model .property.primitive {
    color: #7dd3fc !important;
  }

  /* === EXECUTE BUTTON === */
  .swagger-ui .btn.execute {
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%) !important;
    border: none !important;
    color: #ffffff !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 700 !important;
    font-size: 0.85rem !important;
    padding: 10px 24px !important;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(59,130,246,0.35) !important;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    cursor: pointer;
  }

  .swagger-ui .btn.execute:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59,130,246,0.45) !important;
  }

  .swagger-ui .btn.execute:active {
    transform: translateY(0);
  }

  /* === TRY-IT-OUT BUTTON === */
  .swagger-ui .try-out__btn {
    background: rgba(30,41,59,0.8) !important;
    color: var(--em) !important;
    border: 1px solid rgba(56,189,248,0.25) !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 600 !important;
    font-size: 0.8rem !important;
    padding: 6px 16px !important;
    transition: all 0.2s ease;
  }

  .swagger-ui .try-out__btn:hover {
    background: rgba(56,189,248,0.08) !important;
    border-color: rgba(56,189,248,0.5) !important;
  }

  /* === CANCEL BUTTON === */
  .swagger-ui .btn.cancel {
    background: rgba(239,68,68,0.1) !important;
    color: var(--red) !important;
    border: 1px solid rgba(239,68,68,0.25) !important;
    border-radius: var(--radius-sm) !important;
    font-weight: 600 !important;
    font-size: 0.8rem !important;
    padding: 6px 16px !important;
  }

  /* === RESPONSE SECTION === */
  .swagger-ui .responses-inner {
    padding: 0 16px 16px !important;
  }

  .swagger-ui .response-col_status {
    color: var(--text-1) !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 700 !important;
    font-size: 0.9rem !important;
  }

  /* Color code HTTP status codes */
  .swagger-ui .response_current .response-col_status { color: #34d399 !important; }

  .swagger-ui .response-col_description {
    color: var(--text-2) !important;
    font-size: 0.85rem !important;
  }

  .swagger-ui .live-responses-table .response-col_description pre {
    background: #060a14 !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    padding: 14px !important;
    color: #d1fae5 !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.82rem !important;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
  }

  .swagger-ui .live-responses-table .response-col_status {
    color: #34d399 !important;
  }

  /* === CURL COMMAND BLOCK === */
  .swagger-ui .curl-command {
    background: #060a14 !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    padding: 14px !important;
    color: #a5f3fc !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.8rem !important;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* === COPY BUTTON (CURL) === */
  .swagger-ui .copy-to-clipboard {
    background: rgba(56,189,248,0.1) !important;
    border: 1px solid rgba(56,189,248,0.2) !important;
    border-radius: var(--radius-sm) !important;
    color: var(--em) !important;
    padding: 5px 12px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .swagger-ui .copy-to-clipboard:hover {
    background: rgba(56,189,248,0.18) !important;
  }

  /* === MODELS SECTION === */
  .swagger-ui section.models {
    background: rgba(7,9,15,0.8) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-lg) !important;
    overflow: hidden;
    margin-top: 28px;
  }

  .swagger-ui section.models h4 {
    color: var(--text-1) !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border) !important;
    margin: 0 !important;
    background: rgba(0,0,0,0.2);
  }

  .swagger-ui section.models .model-container {
    margin: 0 !important;
    padding: 0 !important;
    border-bottom: 1px solid var(--border);
  }

  .swagger-ui section.models .model-container:last-child {
    border-bottom: none;
  }

  .swagger-ui .model-box {
    background: #060a14 !important;
    border-radius: 0 !important;
    padding: 16px 20px !important;
    margin: 0 !important;
  }

  /* === BADGES & MISC === */
  .swagger-ui .tab li:first-of-type:after {
    background: var(--em) !important;
  }

  .swagger-ui .renderedMarkdown p code {
    background: rgba(56,189,248,0.1) !important;
    color: var(--em) !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.82rem !important;
  }

  .swagger-ui .example-value__section {
    background: #060a14 !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm);
    padding: 10px !important;
  }

  .swagger-ui .example-value__section-header {
    color: var(--text-3) !important;
    font-size: 0.72rem !important;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  /* === MODAL DIALOG === */
  .swagger-ui .dialog-ux .modal-ux {
    background: #0d1626 !important;
    border: 1px solid rgba(99,102,241,0.3) !important;
    border-radius: var(--radius-lg) !important;
    box-shadow: 0 25px 60px rgba(0,0,0,0.7) !important;
    max-width: 520px;
  }

  .swagger-ui .dialog-ux .modal-ux-header {
    background: rgba(0,0,0,0.3) !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 16px 24px !important;
  }

  .swagger-ui .dialog-ux .modal-ux-header h3 {
    color: var(--text-1) !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
  }

  .swagger-ui .dialog-ux .modal-ux-content {
    padding: 20px 24px !important;
  }

  .swagger-ui .dialog-ux .modal-ux-content label {
    color: var(--text-2) !important;
    font-size: 0.85rem !important;
    font-weight: 500;
    display: block;
    margin-bottom: 6px;
  }

  .swagger-ui .auth-container h4,
  .swagger-ui .auth-container h6 {
    color: var(--text-1) !important;
  }

  .swagger-ui .auth-container p {
    color: var(--text-2) !important;
    font-size: 0.82rem !important;
  }

  .swagger-ui .auth-container input {
    background: var(--bg-input) !important;
    border: 1px solid rgba(148,163,184,0.2) !important;
    color: var(--text-1) !important;
    border-radius: var(--radius-sm) !important;
  }

  /* Close modal button */
  .swagger-ui .dialog-ux .modal-ux-header .close-modal {
    color: var(--text-2) !important;
    font-size: 1.2rem !important;
  }

  /* === LOADING STATE === */
  .swagger-ui .loading-container .loading:before {
    border-color: rgba(56,189,248,0.15) !important;
    border-top-color: var(--em) !important;
  }

  /* === FILTER BAR === */
  .swagger-ui .filter input {
    background: var(--bg-input) !important;
    border: 1px solid rgba(148,163,184,0.15) !important;
    border-radius: 99px !important;
    color: var(--text-1) !important;
    padding: 8px 18px !important;
    width: 320px;
  }

  .swagger-ui .filter input:focus {
    border-color: var(--border-focus) !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.12) !important;
    outline: none !important;
  }

  /* === NO OPERATIONS MESSAGE === */
  .swagger-ui .no-margin {
    color: var(--text-3) !important;
    font-style: italic;
    font-size: 0.85rem;
  }

  /* === EXPAND/COLLAPSE ARROW === */
  .swagger-ui .arrow {
    fill: var(--text-2) !important;
  }

  /* === DEPRECATED OPERATION === */
  .swagger-ui .opblock.opblock-deprecated {
    opacity: 0.5 !important;
    border-left-color: var(--text-3) !important;
  }
`;

const customSwaggerJs = `
window.addEventListener('load', function() {
  // Premium header injection
  const topbar = document.querySelector('.swagger-ui .topbar .topbar-wrapper');
  if (topbar && !document.getElementById('svk-header-badge')) {
    const badge = document.createElement('div');
    badge.id = 'svk-header-badge';
    badge.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:12px;';
    badge.innerHTML = [
      '<span style="font-size:0.7rem;color:rgba(148,163,184,0.7);letter-spacing:0.5px">v2.0.0</span>',
      '<span style="width:1px;height:20px;background:rgba(255,255,255,0.1)"></span>',
      '<span style="font-size:0.72rem;color:rgba(148,163,184,0.7);">🔐 JWT Bearer Auth</span>',
      '<span style="width:1px;height:20px;background:rgba(255,255,255,0.1)"></span>',
      '<a href="/health" target="_blank" style="font-size:0.72rem;color:#10b981;text-decoration:none;display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981"></span>Health</a>',
    ].join('');
    topbar.appendChild(badge);
  }
});
`;

const swaggerUiOptions: swaggerUi.SwaggerOptions = {
  customCss: customSwaggerCss,
  customJs: `data:text/javascript,${encodeURIComponent(customSwaggerJs)}`,
  customSiteTitle: "SVK DTH WORLD • API Portal",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    docExpansion: "none",
    filter: true,
    displayRequestDuration: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
    displayOperationId: false,
    supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
    validatorUrl: null,
  },
};

app.use(["/pjsv", "/api-docs", "/swagger"], swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));


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

/* ================= 404 NOT FOUND HANDLER ================= */
// Must be registered AFTER all routes so it only catches truly unmatched requests

app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `API Route ${req.method} ${req.originalUrl || req.url} Not Found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

export default app;