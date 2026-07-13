// redis import removed — client is managed centrally via config/redis.ts
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
import { InvoiceSettings } from "./entities/invoiceSettings";
import { ProfitLoss } from "./entities/profit_loss.entity";


config({
  path: resolve(".env"),
});

const REDIS_URL = process.env.REDIS_URL;

const dbType =
  process.env.DB_TYPE as DataSourceOptions["type"];

// DB config logging is handled in config/database.ts — removed from here to prevent
// duplicate startup log spam before the server has initialized.

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
    InvoiceSettings,
    ProfitLoss
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

  // Redis client is managed centrally via config/redis.ts with retry strategies and error handlers.
  // Do NOT create a second client here — it would be orphaned with no error handling.
  export const client = null;

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