import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import { ALL_ENTITIES } from "../global";

dotenv.config();

// =============================================================================
// SECURITY-HARDENED DATABASE CONFIGURATION
// =============================================================================
//
//  Variable          | Points To          | Who Sets It
//  ------------------|--------------------|-----------------------------------
//  DATABASE_URL      | LOCAL  MySQL       | .env  (mysql://root@127.0.0.1/...)
//  PRODUCTION_DB_URL | LIVE   Aiven PG   | .env + Render Dashboard
//
//  Live DB triggers:
//    NODE_ENV === "production"   (Render always sets this)
//    USE_LIVE_DB === "true"      (force live DB locally for testing)
//
//  Render Dashboard must set:
//    PRODUCTION_DB_URL = postgres://avnadmin:<pw>@...aivencloud.com:27218/svk_business?sslmode=require
//    NODE_ENV          = production
//    DB_SYNC           = false
// =============================================================================

// ---------------------------------------------------------------------------
// SECURITY UTIL: Mask password in a DB URL before logging
// ---------------------------------------------------------------------------
function maskDbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "****";
    return parsed.toString();
  } catch {
    return "[REDACTED - invalid URL format]";
  }
}

// ---------------------------------------------------------------------------
// SSL FIX: Strip SSL query params from URL before passing to TypeORM/pg.
//
// ROOT CAUSE OF "self-signed certificate in certificate chain" ERROR:
//   pg v8+ and pg-connection-string v2.7+ map `sslmode=require` and
//   `sslmode=prefer` to `verify-full` semantics — which validates the
//   server certificate against trusted CAs. Aiven uses a self-signed CA,
//   so this ALWAYS fails with "self-signed certificate in certificate chain".
//
// FIX: Remove sslmode / uselibpqcompat from the URL string entirely.
//   TypeORM's own `ssl: { rejectUnauthorized: false }` config takes over,
//   which keeps TLS encryption ON but skips CA certificate verification.
//   All data is still encrypted end-to-end — only CA validation is skipped.
// ---------------------------------------------------------------------------
function stripSslParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    // Remove trailing ? if no params remain
    return parsed.toString();
  } catch {
    // Fallback: regex strip if URL() can't parse it
    return url
      .replace(/[?&]sslmode=[^&]*/g, "")
      .replace(/[?&]uselibpqcompat=[^&]*/g, "")
      .replace(/\?$/, "");
  }
}

// ---------------------------------------------------------------------------
// SECURITY UTIL: Validate a database URL has required parts
// ---------------------------------------------------------------------------
function validateDbUrl(url: string, varName: string): void {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) throw new Error("Missing hostname");
    if (!parsed.pathname || parsed.pathname === "/") throw new Error("Missing database name");
    const validSchemes = ["mysql:", "mysql2:", "postgres:", "postgresql:"];
    if (!validSchemes.includes(parsed.protocol)) {
      throw new Error(`Unsupported scheme: ${parsed.protocol}`);
    }
  } catch (err: any) {
    console.error(`[DB] SECURITY: Invalid ${varName} format - ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// SECURITY UTIL: Validate port is within safe range
// ---------------------------------------------------------------------------
function safePort(raw: string | undefined, defaultPort: number): number {
  const port = Number(raw ?? defaultPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[DB] SECURITY: Invalid port value "${raw}". Must be 1-65535.`);
    process.exit(1);
  }
  return port;
}

// ---------------------------------------------------------------------------
// SECURITY UTIL: Validate database name — only alphanumeric + underscore
// ---------------------------------------------------------------------------
function safeDbName(name: string | undefined, fallback: string): string {
  const db = (name ?? fallback).trim();
  if (!/^[a-zA-Z0-9_]+$/.test(db)) {
    console.error(`[DB] SECURITY: Database name "${db}" contains invalid characters. Only a-z, 0-9, _ allowed.`);
    process.exit(1);
  }
  return db;
}

// ---------------------------------------------------------------------------
// SECURITY UTIL: Validate hostname — prevent SSRF / injection
// ---------------------------------------------------------------------------
function safeHostname(host: string | undefined, fallback: string): string {
  const h = (host ?? fallback).trim();
  if (!/^[a-zA-Z0-9.\-]+$/.test(h)) {
    console.error(`[DB] SECURITY: Hostname "${h}" contains invalid characters.`);
    process.exit(1);
  }
  return h;
}

// =============================================================================
// ENVIRONMENT FLAGS
// =============================================================================
const isProduction = process.env.NODE_ENV === "production";
const useLiveDb    = isProduction ||
                     String(process.env.USE_LIVE_DB ?? "false").toLowerCase().trim() === "true";

// Production safety: NEVER allow DB_SYNC=true in production
const syncEnvValue = String(process.env.DB_SYNC ?? "true").toLowerCase().trim();
if (isProduction && syncEnvValue === "true") {
  console.error(
    "[DB] SECURITY BLOCK: DB_SYNC=true is FORBIDDEN in production!\n" +
    "  TypeORM synchronize() can DROP columns and destroy data.\n" +
    "  Set DB_SYNC=false in Render Dashboard immediately."
  );
  process.exit(1);
}
const shouldSync = syncEnvValue === "true";

let dbConfig: DataSourceOptions;

// =============================================================================
// PATH 1: LIVE / PRODUCTION  ->  Aiven PostgreSQL (PRODUCTION_DB_URL)
// =============================================================================
if (useLiveDb) {
  const rawLiveUrl = process.env.PRODUCTION_DB_URL;

  if (!rawLiveUrl) {
    console.error(
      "\n[DB] ERROR: PRODUCTION_DB_URL is not set!\n" +
      "  -> Render Dashboard: add PRODUCTION_DB_URL = <Aiven connection string>\n" +
      "  -> Local testing:    set USE_LIVE_DB=false to use local MySQL instead\n"
    );
    process.exit(1);
  }

  // Validate URL structure before using it
  validateDbUrl(rawLiveUrl, "PRODUCTION_DB_URL");

  // CRITICAL SSL FIX: Strip sslmode from URL so pg driver does NOT override
  // TypeORM's ssl:{ rejectUnauthorized:false } config with verify-full semantics.
  const liveUrl = stripSslParams(rawLiveUrl);

  // Log host ONLY — never log the full URL (contains password)
  try {
    const parsed = new URL(liveUrl);
    console.log(`[DB] Live database: ${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`);
  } catch { /* ignore */ }

  dbConfig = {
    type: "postgres",
    url: liveUrl,
    synchronize: shouldSync,
    logging: false,                             // never log queries in production
    entities: [...ALL_ENTITIES] as any[],

    // SSL: Aiven uses TLS with a self-signed CA.
    // rejectUnauthorized:false = accept self-signed CA (encryption still ON).
    // This config is now respected because sslmode was stripped from the URL above.
    ssl: { rejectUnauthorized: false },

    // Connection pool (Aiven free plan limit = 20 connections)
    poolSize: 10,
    extra: {
      max:                       10,
      min:                        2,            // keep 2 warm connections alive
      connectionTimeoutMillis: 30_000,          // fail fast if Aiven unreachable
      idleTimeoutMillis:       60_000,          // release idle connections after 60s
      statement_timeout:       60_000,          // kill runaway queries after 60s
      lock_timeout:            10_000,          // kill lock waits after 10s
      application_name:        "svk-api-prod", // visible in Aiven monitoring
    },
  };

// =============================================================================
// PATH 2: LOCAL DEVELOPMENT  ->  Local MySQL / Postgres (DATABASE_URL)
// =============================================================================
} else {
  const localUrl = process.env.DATABASE_URL;
  const dbType   = (process.env.DB_TYPE || "mysql") as "mysql" | "postgres";

  if (localUrl) {
    validateDbUrl(localUrl, "DATABASE_URL");
    const isLocalPostgres = localUrl.startsWith("postgres");

    console.log(`[DB] Local database: ${maskDbUrl(localUrl)}`);

    if (isLocalPostgres) {
      dbConfig = {
        type:        "postgres",
        url:          stripSslParams(localUrl),
        synchronize:  shouldSync,
        logging:     ["error", "warn", "schema"],
        entities:    [...ALL_ENTITIES] as any[],
        poolSize:     5,
        extra: {
          max:                       5,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis:       30_000,
          statement_timeout:       30_000,
          application_name:        "svk-api-dev",
        },
      };
    } else {
      // TypeORM MySQL driver does not support URL directly — parse manually
      const parsed = new URL(localUrl);
      dbConfig = {
        type:        "mysql",
        host:         safeHostname(parsed.hostname, "127.0.0.1"),
        port:         safePort(parsed.port, 3306),
        username:     parsed.username  || process.env.DB_USERNAME || "root",
        password:     parsed.password  || process.env.DB_PASSWORD || "",
        database:     safeDbName(parsed.pathname.replace(/^\//, ""), process.env.DB_DATABASE || "svk_business"),
        synchronize:  shouldSync,
        logging:     ["error", "warn", "schema"],
        entities:    [...ALL_ENTITIES] as any[],
        extra: {
          connectionLimit:    10,
          charset:            "utf8mb4_unicode_ci",
          multipleStatements: false,            // block multi-statement SQL injection
          connectTimeout:     10_000,
        },
      };
    }

  } else if (dbType === "postgres") {
    const host = safeHostname(process.env.DB_HOST, "127.0.0.1");
    const db   = safeDbName(process.env.DB_DATABASE, "svk_business");
    console.log(`[DB] Local database: ${host}:${process.env.DB_PORT || 5432}/${db} (postgres vars)`);

    dbConfig = {
      type:        "postgres",
      host,
      port:         safePort(process.env.DB_PORT, 5432),
      username:     process.env.DB_USERNAME,
      password:     process.env.DB_PASSWORD,
      database:     db,
      synchronize:  shouldSync,
      logging:     ["error", "warn", "schema"],
      entities:    [...ALL_ENTITIES] as any[],
      poolSize:     5,
      extra: {
        max:                       5,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis:       30_000,
        statement_timeout:       30_000,
        application_name:        "svk-api-dev",
      },
    };

  } else {
    const host = safeHostname(process.env.DB_HOST, "127.0.0.1");
    const db   = safeDbName(process.env.DB_DATABASE, "svk_business");
    console.log(`[DB] Local database: ${host}:${process.env.DB_PORT || 3306}/${db} (mysql vars)`);

    dbConfig = {
      type:        "mysql",
      host,
      port:         safePort(process.env.DB_PORT, 3306),
      username:     process.env.DB_USERNAME || "root",
      password:     process.env.DB_PASSWORD || "",
      database:     db,
      synchronize:  shouldSync,
      logging:     ["error", "warn", "schema"],
      entities:    [...ALL_ENTITIES] as any[],
      extra: {
        connectionLimit:    10,
        charset:            "utf8mb4_unicode_ci",
        multipleStatements: false,
        connectTimeout:     10_000,
      },
    };
  }
}

const dataSource = new DataSource(dbConfig);

export default dataSource;
