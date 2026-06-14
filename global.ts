import * as redis from "redis";
import { config } from "dotenv";
import { resolve } from "path";
import { DataSourceOptions } from "typeorm";
import { PascalCaseNamingStrategy } from "./src/utils/pascalCase";

import { Register } from "./src/entities/register";
import { OtpVerification } from "./src/entities/otp";
import { Coupon, CouponProduct } from "./src/entities/coupons";
import { Order, OrderItem } from "./src/entities/order";
import { Product } from "./src/entities/products";
import { UserAddress } from "./src/entities/userAddress";

config({
  path: resolve(".env"),
});

const REDIS_URL = process.env.REDIS_URL;

const dbType =
  process.env.DB_TYPE as DataSourceOptions["type"];

/* ==========================================
   DATABASE CONFIG LOG
========================================== */

console.log(
  "========== DATABASE CONFIG =========="
);

console.log(
  "DB_TYPE:",
  process.env.DB_TYPE
);

console.log(
  "DB_HOST:",
  process.env.DB_HOST
);

console.log(
  "DB_PORT:",
  process.env.DB_PORT
);

console.log(
  "DB_USERNAME:",
  process.env.DB_USERNAME
);

console.log(
  "DB_PASSWORD:",
  process.env.DB_PASSWORD
    ? "******"
    : "EMPTY"
);

console.log(
  "DB_DATABASE:",
  process.env.DB_DATABASE
);

console.log(
  "===================================="
);

/* ==========================================
   MYSQL CONFIG
========================================== */

let localConfig: DataSourceOptions = {
  type: "mysql",

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  username: process.env.DB_USERNAME,

  password: process.env.DB_PASSWORD,

  database: process.env.DB_DATABASE,

  legacySpatialSupport: false,

  synchronize:
    process.env.DB_SYNC === "true" &&
    process.env.NODE_ENV ===
      "development",

  logging:
    process.env.NODE_ENV ===
    "development",

  timezone: "Z",

  charset: "utf8mb4_unicode_ci",

  entities: [
    Register,
    OtpVerification,
    Coupon,
    CouponProduct,
    Order,
    OrderItem,
    Product,
    UserAddress,
  ],

  namingStrategy:
    new PascalCaseNamingStrategy(),

  migrationsRun: true,
};

/* ==========================================
   POSTGRES CONFIG
========================================== */

if (dbType === "postgres") {
  localConfig = {
    type: "postgres",

    host: process.env.DB_HOST,

    port: Number(
      process.env.DB_PORT
    ),

    username:
      process.env.DB_USERNAME,

    password:
      process.env.DB_PASSWORD,

    database:
      process.env.DB_DATABASE,

    synchronize:
      process.env.DB_SYNC ===
        "false" &&
      process.env.NODE_ENV ===
        "development",

    logging:
      process.env.NODE_ENV ===
      "development",

    entities: [
      Register,
    ],

    namingStrategy:
      new PascalCaseNamingStrategy(),

  migrationsRun: false,
  };
}

/* ==========================================
   GLOBAL CONFIG
========================================== */

export namespace Global {
  export const network =
    process.env.NODE_ENV ===
    "development"
      ? "Testnet"
      : "Mainnet";

  console.log(REDIS_URL);

  export const client =
    REDIS_URL
      ? redis.createClient({
          url: REDIS_URL,
        })
      : null;

  export const dbConfig =
    localConfig;

  export const DbType =
    dbType;

  export let lang: any;

  export let publicApiUrl: any;

  export let publicWebUrl: any;

  export let UserTypes: any;

  export let user: any;

  export let defaultLang: any;

  export const AllowedOriginsCache: Set<string> =
    new Set();
}