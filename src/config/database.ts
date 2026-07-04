import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const dataSource = new DataSource({
  type: "mysql",

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // ⚡ IMPORTANT (DEV ONLY)
  synchronize: process.env.NODE_ENV !== "production",

  // 🔥 LOGGING (safe mode)
  logging: process.env.NODE_ENV !== "production",

  // ⚡ ENTITIES
  entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],

  // 🚀 MYSQL CONNECTION POOL (REAL PERFORMANCE BOOST)
  extra: {
    connectionLimit: 20,
    charset: "utf8mb4_unicode_ci"
  }
});

export default dataSource;