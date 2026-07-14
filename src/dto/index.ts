// ═══════════════════════════════════════════════════════════════════════════
// src/dto/index.ts
//
// Central barrel — import ANY DTO from this single entry point:
//   import { CreateOrderDto, RegisterDto, ... } from "../dto";
//
// Organization:
//   1. Auth & Users
//   2. Organization (Company / Branch)
//   3. HR (Employee / Salary / Leave / Attendance / Break)
//   4. Catalog (Category / Product / Attribute)
//   5. Commerce (Order / Cart / Payment / Coupon / Delivery / Stock)
//   6. RBAC (Role / Menu / Permission / Role-Access)
//   7. CRM (Contact)
//   8. Swagger schema helper
// ═══════════════════════════════════════════════════════════════════════════
import "reflect-metadata";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataStorage } from "class-validator";

// ── 1. Auth & Users ────────────────────────────────────────────────────────
export * from "./auth.dto";
// Backward-compat shims (legacy imports still work):
export * from "./register.dto";
export * from "./forgetPassword.dto";
export * from "./otp.dto";

// ── 2. Organization ────────────────────────────────────────────────────────
export * from "./company.dto";
export * from "./branch.dto";

// ── 3. HR & Workforce ──────────────────────────────────────────────────────
export * from "./Employee.dto";
export * from "./salary.dto";
export * from "./leave.dto";
export * from "./Attendance.dto";
export * from "./CreateBreakSetting.Dto";

// ── 4. Catalog ─────────────────────────────────────────────────────────────
export * from "./category.dto";
export * from "./products.dto";
export * from "./productAttribute.dto";

// ── 5. Commerce ────────────────────────────────────────────────────────────
export * from "./order.dto";
export * from "./payment.dto";
export * from "./coupon.dto";
export * from "./delivery.dto";
export * from "./branchStock.dto";
export * from "./stock.dto";

// ── 6. RBAC ────────────────────────────────────────────────────────────────
export * from "./roles.dto";
export * from "./menu.dto";
export * from "./role-access.dto";

// ── 7. CRM ─────────────────────────────────────────────────────────────────
export * from "./contact.dto";

// ═══════════════════════════════════════════════════════════════════════════
// Swagger / OpenAPI schema generator
// ═══════════════════════════════════════════════════════════════════════════
export const AllSchemas = validationMetadatasToSchemas({
  classValidatorMetadataStorage: getMetadataStorage(),
  refPointerPrefix: "#/components/schemas/",
});