import { AdminController } from "./admin.Controller";
import { AttendanceController } from "./attendance.controller";
import { AuthController } from "./auth.Controller";
import { BranchController } from "./branch.Controller";
import { BranchStockController } from "./BranchStock.Controller";
import { CartController } from "./cart.Controller";
import { CategoryController } from "./category.Controller";
import { CompanyController } from "./company.Controller";
import { CouponController } from "./coupons.Controller";
import { EmployeeController } from "./employee.controller";
import { LeaveController } from "./leave.controller";
import { OrderController } from "./order.Controller";
import { OtpController } from "./otp.Controller";
import { PasswordController } from "./password.controller";
import { PayrollController } from "./payroll.controller";
import { ProductController } from "./product.Controller";
import {
  ProductAttributeController,
  ProductAttributeValueController,
} from "./productAttribute.Controller";
import { StatusController } from "./status.Controller";
import { RoleAccessController } from "./role-access.controller";
import { RoleController } from "./role.Controller";
import { AlertController, PaymentController, StockController } from "./stock.Controller";
import { DeliveryTrackingController } from "./tracking.Controller";
import { MenuController } from "./menu.Controller";
import { ProfileController } from "./profile.Controller";
import { AuditController } from "./auditLogs.Controller";
import { ShiftController } from "./shift.controller";
import { BreakPolicyController } from "./break-policy.controller";
import { BiometricController } from "./biometric.controller";
import { WorkforceDashboardController } from "./workforce-dashboard.controller";
import { InvoiceController } from "./invoice.Controller";
import { ApprovalsController } from "./approvals.Controller";
import { AiController } from "./ai.Controller";

export const authController = new AuthController();

export const otpController = new OtpController();

export const productController = new ProductController();

export const orderController = new OrderController();

export const couponController = new CouponController();

export const stockController = new StockController();

export const alertController = new AlertController();

export const paymentController = new PaymentController();

export const employeeController = new EmployeeController();

export const leaveController = new LeaveController();

export const payrollController = new PayrollController();

export const attendanceController = new AttendanceController();

export const branchStockController = new BranchStockController();

export const deliveryTrackingController = new DeliveryTrackingController();

export const roleAccessController = new RoleAccessController();

export const cartController = new CartController();

export const categoryController = new CategoryController();

export const productAttributeController = new ProductAttributeController();

export const productAttributeValueController = new ProductAttributeValueController();

export const statusController = new StatusController();

export const passwordController = new PasswordController();
 
export const companyController = new CompanyController();

export const branchController = new BranchController();

export const adminController = new AdminController();

export const rolesController = new RoleController();

export const menuController = new MenuController();

export const auditLogsController = new AuditController();

export const profileController = new ProfileController();

// ── Enterprise Workforce Management ──────────────────────────────────────
export const shiftController              = new ShiftController();
export const breakPolicyController        = new BreakPolicyController();
export const biometricController          = new BiometricController();
export const workforceDashboardController = new WorkforceDashboardController();

// ── Invoice Management ───────────────────────────────────────────────────
export const invoiceController            = new InvoiceController();

// ── Approvals Management ─────────────────────────────────────────────────
export const approvalsController          = new ApprovalsController();

// ── Gemini AI Management ──────────────────────────────────────────────────
export const aiController                 = new AiController();