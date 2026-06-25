import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const dataSource = new DataSource({
  type: "mysql",

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // ⚡ IMPORTANT (DEV ONLY)
  synchronize: process.env.NODE_ENV === "development",

  // 🔥 LOGGING (safe mode)
  logging: process.env.NODE_ENV === "development",

  // ⚡ ENTITIES
  entities: ["src/entities/**/*.ts"],

  // 🚀 MYSQL CONNECTION POOL (REAL PERFORMANCE BOOST)
  extra: {
    connectionLimit: 20,
    charset: "utf8mb4_unicode_ci"
  }
});

export default dataSource;