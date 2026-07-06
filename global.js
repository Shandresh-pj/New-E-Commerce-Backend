"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Global = void 0;
const redis = __importStar(require("redis"));
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const pascalCase_1 = require("./src/utils/pascalCase");
const register_1 = require("./src/entities/register");
const otp_1 = require("./src/entities/otp");
const coupons_1 = require("./src/entities/coupons");
const order_1 = require("./src/entities/order");
const products_1 = require("./src/entities/products");
const payment_1 = require("./src/entities/payment");
const stock_1 = require("./src/entities/stock");
const userAddress_1 = require("./src/entities/userAddress");
const branch_stock_1 = require("./src/entities/branch_stock");
const attendance_entity_1 = require("./src/entities/attendance.entity");
const break_setting_entity_1 = require("./src/entities/break-setting.entity");
const delivery_entity_1 = require("./src/entities/delivery.entity");
const employee_entity_1 = require("./src/entities/employee.entity");
const leave_entity_1 = require("./src/entities/leave.entity");
const lowstock_1 = require("./src/entities/lowstock");
const salary_1 = require("./src/entities/salary");
const customerLocation_dto_1 = require("./src/entities/customerLocation.dto");
const category_1 = require("./src/entities/category");
const productAttribute_1 = require("./src/entities/productAttribute");
const productVariant_1 = require("./src/entities/productVariant");
const status_entity_1 = require("./src/entities/status.entity");
const password_reset_entity_1 = require("./src/entities/password-reset.entity");
const branch_1 = require("./src/entities/branch");
const company_1 = require("./src/entities/company");
const menu_1 = require("./src/entities/menu");
const user_1 = require("./src/entities/user");
const roles_1 = require("./src/entities/roles");
const wishlist_1 = require("./src/entities/wishlist");
const role_access_1 = require("./src/entities/role-access");
const auditLogs_1 = require("./src/entities/auditLogs");
(0, dotenv_1.config)({
    path: (0, path_1.resolve)(".env"),
});
const REDIS_URL = process.env.REDIS_URL;
const dbType = process.env.DB_TYPE;
console.log("========== DATABASE CONFIG ==========");
console.log("DB_TYPE:", process.env.DB_TYPE);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USERNAME:", process.env.DB_USERNAME);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD
    ? "******"
    : "EMPTY");
console.log("DB_DATABASE:", process.env.DB_DATABASE);
console.log("====================================");
let localConfig = {
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    legacySpatialSupport: false,
    synchronize: process.env.DB_SYNC === "true" &&
        process.env.NODE_ENV ===
            "development",
    logging: process.env.NODE_ENV ===
        "development",
    timezone: "Z",
    charset: "utf8mb4_unicode_ci",
    entities: [
        attendance_entity_1.AttendanceBreakLog,
        attendance_entity_1.Attendance,
        branch_1.Branch,
        branch_stock_1.BranchStock,
        break_setting_entity_1.BreakSetting,
        company_1.Company,
        customerLocation_dto_1.CustomerLocation,
        coupons_1.Coupon,
        coupons_1.CouponProduct,
        products_1.Cart,
        category_1.Category,
        delivery_entity_1.DeliveryTracking,
        delivery_entity_1.DeliveryAssignment,
        employee_entity_1.Employee,
        lowstock_1.LowStockAlert,
        leave_entity_1.LeaveRequest,
        menu_1.Menu,
        order_1.Order,
        order_1.OrderItem,
        otp_1.OtpVerification,
        order_1.OrderTracking,
        register_1.Register,
        products_1.Product,
        payment_1.Payment,
        menu_1.Permission,
        password_reset_entity_1.PasswordReset,
        productAttribute_1.ProductAttribute,
        productAttribute_1.ProductAttributeValue,
        productAttribute_1.ProductAttributeValueProduct,
        productVariant_1.ProductVariant,
        role_access_1.RolePermission,
        user_1.UserRole,
        salary_1.Salary,
        stock_1.StockLog,
        status_entity_1.Status,
        roles_1.Role,
        userAddress_1.UserAddress,
        user_1.User,
        wishlist_1.Wishlist,
        auditLogs_1.AuditLogBackup,
        auditLogs_1.AuditLog
    ],
    namingStrategy: new pascalCase_1.PascalCaseNamingStrategy(),
    migrationsRun: true,
};
if (dbType === "postgres") {
    localConfig = {
        type: "postgres",
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        synchronize: process.env.DB_SYNC ===
            "false" &&
            process.env.NODE_ENV ===
                "development",
        logging: process.env.NODE_ENV ===
            "development",
        entities: [
            register_1.Register,
        ],
        namingStrategy: new pascalCase_1.PascalCaseNamingStrategy(),
        migrationsRun: false,
    };
}
var Global;
(function (Global) {
    Global.network = process.env.NODE_ENV ===
        "development"
        ? "Testnet"
        : "Mainnet";
    console.log(REDIS_URL);
    Global.client = REDIS_URL
        ? redis.createClient({
            url: REDIS_URL,
        })
        : null;
    Global.dbConfig = localConfig;
    Global.DbType = dbType;
    Global.AllowedOriginsCache = new Set();
})(Global || (exports.Global = Global = {}));
//# sourceMappingURL=global.js.map