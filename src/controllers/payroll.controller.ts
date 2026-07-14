import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { auditMiddleware } from "../middleware/audit.Middleware";
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
    const { employee_id, month, year } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({ success: false, message: "employee_id, month, year are required" });
    }

    const payroll = await payrollService.generateMonthlyPayroll({
      employee_id:  Number(employee_id),
      month,
      year:         Number(year),
      generated_by: req.user.userId,
    });

    return res.status(201).json({ success: true, message: "Payroll generated", data: payroll });
  }

  // ── Approve Payroll ───────────────────────────────────────────────────
  @Post("/approve/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Approve Payroll", "Approve a draft payroll record")
  async approve(req: any, res: Response) {
    const payroll = await payrollService.approvePayroll(Number(req.params.id), req.user.userId);
    return res.json({ success: true, message: "Payroll approved", data: payroll });
  }

  // ── Mark as Paid ──────────────────────────────────────────────────────
  @Post("/mark-paid/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Mark Payroll Paid", "Mark an approved payroll as paid with payment details")
  async markPaid(req: any, res: Response) {
    const { payment_method, payment_reference } = req.body;
    if (!payment_method || !payment_reference) {
      return res.status(400).json({ success: false, message: "payment_method and payment_reference are required" });
    }

    const payroll = await payrollService.markPaid(Number(req.params.id), { payment_method, payment_reference });
    return res.json({ success: true, message: "Payroll marked as paid", data: payroll });
  }

  // ── Monthly Summary ───────────────────────────────────────────────────
  @Get("/summary")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll Summary", "Monthly salary summary for company/branch")
  async summary(req: any, res: Response) {
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
  }

  // ── Payslip Data ──────────────────────────────────────────────────────
  @Get("/slip/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Payslip", "Get detailed payslip data for an employee's payroll")
  async payslip(req: any, res: Response) {
    const data = await payrollService.getPayslip(Number(req.params.id), req.user);
    return res.json({ success: true, data });
  }

  // ── List All Payroll Records ──────────────────────────────────────────
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll List", "Get all payroll records with optional filters")
  async getAll(req: any, res: Response) {
    const repo  = dataSource.getRepository(Salary);
    const where: any = TenantService.scopeWhere(req.user);

    if (req.query.status)      where.status      = req.query.status;
    if (req.query.month)       where.month        = req.query.month;
    if (req.query.year)        where.year         = Number(req.query.year);
    if (req.query.employee_id) where.employee_id  = Number(req.query.employee_id);

    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const [records, total] = await repo.findAndCount({
      where,
      order: { id: "DESC" },
      skip:  (page - 1) * limit,
      take:  limit,
    });

    return res.json({ success: true, data: records, total, page, limit });
  }

  // ── Single Payroll ────────────────────────────────────────────────────
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Payroll Detail", "Get single payroll record by ID")
  async getOne(req: any, res: Response) {
    const repo    = dataSource.getRepository(Salary);
    const payroll = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
    return res.json({ success: true, data: payroll });
  }
}