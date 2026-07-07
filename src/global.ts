import * as redis from "redis";
import { config } from "dotenv";
import { resolve } from "path";
import { DataSourceOptions } from "typeorm";
import { Order, OrderItem, OrderTracking } from "./entities/order";
import { Attendance, AttendanceBreakLog } from "./entities/attendance.entity";
import { AuditLog, AuditLogBackup } from "./entities/auditLogs";
import { Branch } from "./entities/branch";
import { BranchStock } from "./entities/branch_stock";
import { BreakSetting } from "./entities/break-setting.entity";
import { Category } from "./entities/category";
import { Company } from "./entities/company";
import { Coupon, CouponProduct } from "./entities/coupons";
import { CustomerLocation } from "./entities/customerLocation.dto";
import { DeliveryAssignment, DeliveryTracking } from "./entities/delivery.entity";
import { Employee } from "./entities/employee.entity";
import { LeaveRequest } from "./entities/leave.entity";
import { LowStockAlert } from "./entities/lowstock";
import { Menu, Permission } from "./entities/menu";
import { OtpVerification } from "./entities/otp";
import { PasswordReset } from "./entities/password-reset.entity";
import { Payment } from "./entities/payment";
import { ProductAttribute, ProductAttributeValue, ProductAttributeValueProduct } from "./entities/productAttribute";
import { Cart, Product } from "./entities/products";
import { ProductVariant } from "./entities/productVariant";
import { Register } from "./entities/register";
import { RolePermission } from "./entities/role-access";
import { Role } from "./entities/roles";
import { Salary } from "./entities/salary";
import { Status } from "./entities/status.entity";
import { StockLog } from "./entities/stock";
import { User, UserRole } from "./entities/user";
import { UserAddress } from "./entities/userAddress";
import { Wishlist } from "./entities/wishlist";
import { PascalCaseNamingStrategy } from "./utils/pascalCase";
import { InvoiceSetting } from "./entities/invoice.entity";


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
    AttendanceBreakLog,
    Attendance,
    Branch,
    BranchStock,
    BreakSetting,
    Company,
    CustomerLocation,
    Coupon, 
    CouponProduct,
    Cart, 
    Category,
    DeliveryTracking,
    DeliveryAssignment,
    Employee,
    LowStockAlert,
    LeaveRequest,
    Menu,
    Order,
    OrderItem,
    OtpVerification,
    OrderTracking,
    Register,
    Product,
    Payment,
    Permission,
    PasswordReset,
    ProductAttribute,
    ProductAttributeValue,
    ProductAttributeValueProduct,
    ProductVariant,
    RolePermission,
    UserRole,
    Salary,
    StockLog,
    Status,
    Role,
    UserAddress,
    User,
    Wishlist,
    AuditLogBackup,
    AuditLog,
    InvoiceSetting
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