import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(".env") });

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY IMPORTS — every entity class used by TypeORM must be listed here.
// global.ts is the single source of truth for all database tables.
// database.ts reads ALL_ENTITIES from here so no glob pattern is needed.
// ─────────────────────────────────────────────────────────────────────────────

// Auth / Users
import { User, UserRole }                              from "./entities/user";
import { Register }                                    from "./entities/register";
import { UserAddress }                                 from "./entities/userAddress";

// Roles & Permissions
import { Role }                                        from "./entities/roles";
import { RolePermission }                              from "./entities/role-access";
import { Menu, Permission }                            from "./entities/menu";

// Company & Branch
import { Company }                                     from "./entities/company";
import { Branch }                                      from "./entities/branch";
import { BranchTransfer }                              from "./entities/branchTransfer";
import { BranchStock }                                 from "./entities/branch_stock";

// Products & Categories
import { Product, Cart }                               from "./entities/products";
import { Category }                                    from "./entities/category";
import { ProductVariant }                              from "./entities/productVariant";
import { ProductAttribute, ProductAttributeValue, ProductAttributeValueProduct } from "./entities/productAttribute";
import { ProductApproval }                             from "./entities/productApproval";

// Orders & Payments
import { Order, OrderItem, OrderTracking }             from "./entities/order";
import { Payment }                                     from "./entities/payment";
import { Invoice }                                     from "./entities/invoice";
import { InvoiceSettings }                             from "./entities/invoiceSettings";
import { Coupon, CouponProduct }                       from "./entities/coupons";

// Inventory & Stock
import { StockLog }                                    from "./entities/stock";
import { LowStockAlert }                               from "./entities/lowstock";

// Delivery
import { DeliveryAssignment, DeliveryTracking }        from "./entities/delivery.entity";

// Customers & CRM
import { CustomerLocation }                            from "./entities/customerLocation.dto";
import { Contact }                                     from "./entities/contact.entity";
import { Wishlist }                                    from "./entities/wishlist";

// Employees & HR
import { Employee }                                    from "./entities/employee.entity";
import { Salary }                                      from "./entities/salary";
import { LeaveRequest }                                from "./entities/leave.entity";
import { CompanyCalendar }                             from "./entities/company_calendar.entity";
import { EmployeeDocument }                            from "./entities/employee_document.entity";

// Attendance & Shifts
import { Attendance, AttendanceBreakLog }              from "./entities/attendance.entity";
import { AttendanceNotification }                      from "./entities/attendance_notification.entity";
import { Shift, ShiftAssignment }                      from "./entities/shift.entity";
import { BreakPolicy }                                 from "./entities/break_policy.entity";
import { BreakSetting }                                from "./entities/break-setting.entity";

// Biometric
import { BiometricDevice, BiometricAuthLog }           from "./entities/biometric_device.entity";

// Finance
import { ProfitLoss }                                  from "./entities/profit_loss.entity";

// Notifications & Audit
import { Notification }                                from "./entities/notification";
import { AuditLog, AuditLogBackup }                   from "./entities/auditLogs";

// Auth / Security
import { OtpVerification }                             from "./entities/otp";
import { PasswordReset }                               from "./entities/password-reset.entity";

// Misc
import { Status }                                      from "./entities/status.entity";

// Subscriptions & Billing
import { SubscriptionPlan }                            from "./entities/subscription-plan.entity";
import { UserSubscription }                            from "./entities/user-subscription.entity";
import { SubscriptionInvoice }                         from "./entities/subscription-invoice.entity";
import { WebhookLog }                                  from "./entities/webhook-log.entity";
import { SubscriptionCoupon }                          from "./entities/subscription-coupon.entity";
import { PaymentTransaction }                          from "./entities/payment-transaction.entity";
import { Refund }                                      from "./entities/refund.entity";
import { PaymentLog }                                  from "./entities/payment-log.entity";
import { BillingHistory }                              from "./entities/billing-history.entity";

// ─────────────────────────────────────────────────────────────────────────────
// ALL_ENTITIES — the authoritative list registered with TypeORM.
// Add any new entity class here; database.ts will pick it up automatically.
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_ENTITIES = [
  // Auth / Users
  User,
  UserRole,
  Register,
  UserAddress,

  // Roles & Permissions
  Role,
  RolePermission,
  Menu,
  Permission,

  // Company & Branch
  Company,
  Branch,
  BranchTransfer,
  BranchStock,

  // Products & Categories
  Product,
  Cart,
  Category,
  ProductVariant,
  ProductAttribute,
  ProductAttributeValue,
  ProductAttributeValueProduct,
  ProductApproval,

  // Orders & Payments
  Order,
  OrderItem,
  OrderTracking,
  Payment,
  Invoice,
  InvoiceSettings,
  Coupon,
  CouponProduct,

  // Inventory & Stock
  StockLog,
  LowStockAlert,

  // Delivery
  DeliveryAssignment,
  DeliveryTracking,

  // Customers & CRM
  CustomerLocation,
  Contact,
  Wishlist,

  // Employees & HR
  Employee,
  Salary,
  LeaveRequest,
  CompanyCalendar,
  EmployeeDocument,

  // Attendance & Shifts
  Attendance,
  AttendanceBreakLog,
  AttendanceNotification,
  Shift,
  ShiftAssignment,
  BreakPolicy,
  BreakSetting,

  // Biometric
  BiometricDevice,
  BiometricAuthLog,

  // Finance
  ProfitLoss,

  // Notifications & Audit
  Notification,
  AuditLog,
  AuditLogBackup,

  // Auth / Security
  OtpVerification,
  PasswordReset,

  // Misc
  Status,

  // Subscriptions & Billing
  SubscriptionPlan,
  UserSubscription,
  SubscriptionInvoice,
  WebhookLog,
  SubscriptionCoupon,
  PaymentTransaction,
  Refund,
  PaymentLog,
  BillingHistory,
] as const;

/* ============================================================
   GLOBAL NAMESPACE — RUNTIME CONSTANTS
============================================================ */
export namespace Global {
  export const network =
    process.env.NODE_ENV === "development" ? "Testnet" : "Mainnet";

  export let lang: any;
  export let publicApiUrl: any;
  export let publicWebUrl: any;
  export let UserTypes: any;
  export let user: any;
  export let defaultLang: any;

  export const AllowedOriginsCache: Set<string> = new Set();
}