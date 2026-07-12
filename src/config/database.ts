import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

let dbConfig: DataSourceOptions;

if (isProduction) {
  const dbUrl = process.env.DATABASE_URL || process.env.PRODUCTION_DB_URL;

  if (!dbUrl && !process.env.PRODUCTION_DB_HOST && !process.env.DB_HOST) {
    console.error("❌ ERROR: Production database connection details (DATABASE_URL or PRODUCTION_DB_URL) are not set in the environment variables!");
  }

  if (dbUrl) {
    dbConfig = {
      type: "postgres",
      url: dbUrl,
      synchronize: String(process.env.DB_SYNC).toLowerCase().trim() === "true",
      logging: false,
      entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
      ssl: {
        rejectUnauthorized: false,
      },
      poolSize: 10,
      extra: {
        max: 10,
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 30000
      }
    };
  } else {
    dbConfig = {
      type: "postgres",
      host: process.env.PRODUCTION_DB_HOST || process.env.DB_HOST,
      port: Number(process.env.PRODUCTION_DB_PORT || process.env.DB_PORT || 5432),
      username: process.env.PRODUCTION_DB_USERNAME || process.env.DB_USERNAME,
      password: process.env.PRODUCTION_DB_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.PRODUCTION_DB_DATABASE || process.env.DB_DATABASE,
      synchronize: String(process.env.DB_SYNC).toLowerCase().trim() === "true",
      logging: false,
      entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
      ssl: {
        rejectUnauthorized: false,
      },
      poolSize: 10,
      extra: {
        max: 10,
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 30000
      }
    };
  }
} else {
  const dbType = (process.env.DB_TYPE || "mysql") as "mysql" | "postgres";

  if (dbType === "postgres") {
    dbConfig = {
      type: "postgres",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: String(process.env.DB_SYNC).toLowerCase().trim() === "true",
      logging: true,
      entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
      poolSize: 10,
      extra: {
        max: 10,
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 30000
      }
    };
  } else {
    dbConfig = {
      type: "mysql",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: String(process.env.DB_SYNC).toLowerCase().trim() === "true",
      logging: true,
      entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
      extra: {
        connectionLimit: 20,
        charset: "utf8mb4_unicode_ci",
      },
    };
  }
}

const dataSource = new DataSource(dbConfig);

export default dataSource;