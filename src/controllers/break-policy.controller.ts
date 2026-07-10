import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Swagger } from "../decorators";
import dataSource from "../config/database";
import { BreakPolicy } from "../entities/break_policy.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/break-policies")
export class BreakPolicyController {

  // ── Create Policy ─────────────────────────────────────────────────────
  @Post("/")
  @Swagger("Create Break Policy", "Create a new break policy with deduction thresholds")
  async create(req: any, res: Response) {
    const repo = dataSource.getRepository(BreakPolicy);
    const {
      name, break_type, max_duration_minutes, max_frequency,
      allow_split, is_paid, deduction_rules,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Policy name is required" });
    }

    const policy = repo.create({
      company_id: req.user.companyId,
      branch_id:  req.user.branchId,
      name,
      break_type:           break_type ?? "PERSONAL",
      max_duration_minutes: max_duration_minutes ?? 60,
      max_frequency:        max_frequency ?? 3,
      allow_split:          allow_split ?? true,
      is_paid:              is_paid ?? false,
      deduction_rules: deduction_rules ?? {
        warning:          15,
        salary_deduction: 30,
        half_day:         60,
        hr_review:        120,
      },
    });

    await repo.save(policy);
    return res.status(201).json({ success: true, message: "Break policy created", data: policy });
  }

  // ── List Policies ─────────────────────────────────────────────────────
  @Get("/")
  @Swagger("List Break Policies", "Get all break policies")
  async getAll(req: any, res: Response) {
    const repo     = dataSource.getRepository(BreakPolicy);
    const policies = await repo.find({
      where: TenantService.scopeWhere(req.user),
      order: { id: "DESC" },
    });
    return res.json({ success: true, data: policies });
  }

  // ── Active Policy ─────────────────────────────────────────────────────
  @Get("/active")
  @Swagger("Active Break Policy", "Get the active break policy for this branch")
  async active(req: any, res: Response) {
    const repo   = dataSource.getRepository(BreakPolicy);
    const policy = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { is_active: true }),
      order: { id: "DESC" },
    });
    return res.json({ success: true, data: policy });
  }

  // ── Get Single ────────────────────────────────────────────────────────
  @Get("/:id")
  @Swagger("Break Policy Details", "Get single break policy")
  async getOne(req: any, res: Response) {
    const repo   = dataSource.getRepository(BreakPolicy);
    const policy = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    return res.json({ success: true, data: policy });
  }

  // ── Update ────────────────────────────────────────────────────────────
  @Put("/:id")
  @Swagger("Update Break Policy", "Update break policy thresholds")
  async update(req: any, res: Response) {
    const repo   = dataSource.getRepository(BreakPolicy);
    const policy = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const allowed = [
      "name", "break_type", "max_duration_minutes", "max_frequency",
      "allow_split", "is_paid", "deduction_rules", "is_active",
    ];
    allowed.forEach((f) => { if (req.body[f] !== undefined) (policy as any)[f] = req.body[f]; });

    await repo.save(policy);
    return res.json({ success: true, message: "Break policy updated", data: policy });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  @Delete("/:id")
  @Swagger("Delete Break Policy", "Delete a break policy")
  async delete(req: any, res: Response) {
    const repo   = dataSource.getRepository(BreakPolicy);
    const policy = await repo.findOne({
      where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) }),
    });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    await repo.remove(policy);
    return res.json({ success: true, message: "Break policy deleted" });
  }
}
