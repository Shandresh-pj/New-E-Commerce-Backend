import { Request, Response } from "express";
import { Controller, Get, Post, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { PayrollService } from "../services/payroll.service";
import { Salary, PayrollStatus } from "../entities/salary";
import { TenantService } from "../middleware/tenantFilter.middleware";

const payrollService = new PayrollService();

@Controller("/payroll")
export class PayrollController {

  // ── Generate Monthly Payroll ──────────────────────────────────────────
  @Post("/generate")
  @Middleware([authenticateMiddleware])
  @Swagger("Generate Payroll", "Auto-generate payroll from attendance, breaks, leaves, and OT data")
  async generate(req: any, res: Response) {
    try {
      const { employee_id, month, year } = req.body;

      if (!employee_id || !month || !year) {
        return res.status(400).json({ success: false, message: "employee_id, month, year are required" });
      }

      const numericEmployeeId = Number(employee_id);
      const numericYear       = Number(year);

      if (isNaN(numericEmployeeId) || numericEmployeeId <= 0) {
        return res.status(400).json({ success: false, message: "employee_id must be a valid positive number" });
      }
      if (isNaN(numericYear) || numericYear < 2000 || numericYear > 2100) {
        return res.status(400).json({ success: false, message: "year must be a valid 4-digit year" });
      }

      const payroll = await payrollService.generateMonthlyPayroll({
        employee_id:  numericEmployeeId,
        month,
        year:         numericYear,
        generated_by: req.user.userId,
      });

      return res.status(201).json({ success: true, message: "Payroll generated successfully", data: payroll });

    } catch (err: any) {
      console.error("[PayrollController] generate error:", err.message);
      // Business-logic errors (duplicate, no salary, etc.) get 400; unexpected ones get 500
      const isBusinessError =
        err.message.includes("already generated") ||
        err.message.includes("not found") ||
        err.message.includes("no salary configured") ||
        err.message.includes("working days");
      return res.status(isBusinessError ? 400 : 500).json({
        success: false,
        message: err.message || "Failed to generate payroll",
      });
    }
  }

  // ── Approve Payroll ───────────────────────────────────────────────────
  @Post("/approve/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Approve Payroll", "Approve a draft payroll record")
  async approve(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid payroll ID" });

      const payroll = await payrollService.approvePayroll(id, req.user.userId);
      return res.json({ success: true, message: "Payroll approved", data: payroll });

    } catch (err: any) {
      console.error("[PayrollController] approve error:", err.message);
      const isBusinessError = err.message.includes("not found") || err.message.includes("Only DRAFT");
      return res.status(isBusinessError ? 400 : 500).json({
        success: false,
        message: err.message || "Failed to approve payroll",
      });
    }
  }

  // ── Mark as Paid ──────────────────────────────────────────────────────
  @Post("/mark-paid/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Mark Payroll Paid", "Mark an approved payroll as paid with payment details")
  async markPaid(req: any, res: Response) {
    try {
      const { payment_method, payment_reference } = req.body;
      if (!payment_method || !payment_reference) {
        return res.status(400).json({ success: false, message: "payment_method and payment_reference are required" });
      }

      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid payroll ID" });

      const payroll = await payrollService.markPaid(id, { payment_method, payment_reference });
      return res.json({ success: true, message: "Payroll marked as paid", data: payroll });

    } catch (err: any) {
      console.error("[PayrollController] markPaid error:", err.message);
      const isBusinessError = err.message.includes("not found") || err.message.includes("must be APPROVED");
      return res.status(isBusinessError ? 400 : 500).json({
        success: false,
        message: err.message || "Failed to mark payroll as paid",
      });
    }
  }

  // ── Monthly Summary ───────────────────────────────────────────────────
  @Get("/summary")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll Summary", "Monthly salary summary for company/branch")
  async summary(req: any, res: Response) {
    try {
      const { month, year, branch_id } = req.query;

      if (!month || !year) {
        return res.status(400).json({ success: false, message: "month and year are required" });
      }

      const data = await payrollService.getMonthlySummary(
        req.user,
        month as string,
        Number(year),
        branch_id ? Number(branch_id) : undefined,
      );

      return res.json({ success: true, data });

    } catch (err: any) {
      console.error("[PayrollController] summary error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch payroll summary" });
    }
  }

  // ── Payslip Data ──────────────────────────────────────────────────────
  @Get("/slip/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Payslip", "Get detailed payslip data for an employee's payroll")
  async payslip(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid payroll ID" });

      const data = await payrollService.getPayslip(id, req.user);
      return res.json({ success: true, data });

    } catch (err: any) {
      console.error("[PayrollController] payslip error:", err.message);
      const isNotFound = err.message.includes("not found");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: err.message || "Failed to fetch payslip",
      });
    }
  }

  // ── List All Payroll Records ──────────────────────────────────────────
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll List", "Get all payroll records with optional filters")
  async getAll(req: any, res: Response) {
    try {
      const repo  = dataSource.getRepository(Salary);
      const where: any = TenantService.scopeWhere(req.user);

      if (req.query.status)      where.status       = req.query.status;
      if (req.query.month)       where.month         = req.query.month;
      if (req.query.year)        where.year          = Number(req.query.year);
      if (req.query.employee_id) where.employee_id   = Number(req.query.employee_id);

      const page  = Math.max(1, Number(req.query.page  ?? 1));
      const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));

      const [records, total] = await repo.findAndCount({
        where,
        order: { id: "DESC" },
        skip:  (page - 1) * limit,
        take:  limit,
      });

      return res.json({ success: true, data: records, total, page, limit });

    } catch (err: any) {
      console.error("[PayrollController] getAll error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch payroll records" });
    }
  }

  // ── Single Payroll ────────────────────────────────────────────────────
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll Detail", "Get single payroll record by ID")
  async getOne(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid payroll ID" });

      const repo    = dataSource.getRepository(Salary);
      const payroll = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
      return res.json({ success: true, data: payroll });

    } catch (err: any) {
      console.error("[PayrollController] getOne error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch payroll" });
    }
  }
}