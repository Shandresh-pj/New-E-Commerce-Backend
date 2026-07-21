import { Request, Response } from "express";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { BreakPolicy } from "../entities/break_policy.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/break-policies")
export class BreakPolicyController {

  // ── Create Policy ─────────────────────────────────────────────────────
  @Post("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Create Break Policy", "Create a new break policy with deduction thresholds")
  async create(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(BreakPolicy);
      const {
        name, break_type, max_duration_minutes, max_frequency,
        allow_split, is_paid, deduction_rules,
      } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Policy name is required" });
      }

      const policy = repo.create({
        company_id: req.user?.companyId || req.user?.company_id || 1,
        branch_id:  req.user?.branchId || req.user?.branch_id || 1,
        name,
        break_type:           break_type ?? "PERSONAL",
        max_duration_minutes: max_duration_minutes ?? 60,
        max_frequency:        max_frequency ?? 3,
        allow_split:          allow_split === true || allow_split === "true" || allow_split === 1 || allow_split === "1",
        is_paid:              is_paid === true || is_paid === "true" || is_paid === 1 || is_paid === "1",
        deduction_rules: deduction_rules ?? {
          warning:          15,
          salary_deduction: 30,
          half_day:         60,
          hr_review:        120,
        },
      });

      await repo.save(policy);
      return res.status(201).json({ success: true, message: "Break policy created", data: policy });
    } catch (err: any) {
      console.error("[BreakPolicyController] create error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to create break policy" });
    }
  }

  // ── List Policies ─────────────────────────────────────────────────────
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("List Break Policies", "Get all break policies")
  async getAll(req: any, res: Response) {
    try {
      const repo     = dataSource.getRepository(BreakPolicy);
      const policies = await repo.find({
        where: TenantService.scopeWhere(req.user),
        order: { id: "DESC" },
      });
      return res.json({ success: true, data: policies });
    } catch (err: any) {
      console.error("[BreakPolicyController] getAll error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch break policies" });
    }
  }

  // ── Active Policy ─────────────────────────────────────────────────────
  @Get("/active")
  @Middleware([authenticateMiddleware])
  @Swagger("Active Break Policy", "Get the active break policy for this branch")
  async active(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BreakPolicy);
      const policy = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { is_active: true }),
        order: { id: "DESC" },
      });
      return res.json({ success: true, data: policy });
    } catch (err: any) {
      console.error("[BreakPolicyController] active error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch active break policy" });
    }
  }

  // ── Get Single ────────────────────────────────────────────────────────
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Break Policy Details", "Get single break policy")
  async getOne(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BreakPolicy);
      const id     = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid policy ID" });

      const policy = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
      return res.json({ success: true, data: policy });
    } catch (err: any) {
      console.error("[BreakPolicyController] getOne error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch policy details" });
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Break Policy", "Update break policy thresholds")
  async update(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BreakPolicy);
      const id     = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid policy ID" });

      const policy = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

      const allowed = [
        "name", "break_type", "max_duration_minutes", "max_frequency", "deduction_rules"
      ];
      allowed.forEach((f) => { if (req.body[f] !== undefined) (policy as any)[f] = req.body[f]; });

      if (req.body.allow_split !== undefined) {
        policy.allow_split = req.body.allow_split === true || req.body.allow_split === "true" || req.body.allow_split === 1 || req.body.allow_split === "1";
      }
      if (req.body.is_paid !== undefined) {
        policy.is_paid = req.body.is_paid === true || req.body.is_paid === "true" || req.body.is_paid === 1 || req.body.is_paid === "1";
      }
      if (req.body.is_active !== undefined) {
        policy.is_active = req.body.is_active === true || req.body.is_active === "true" || req.body.is_active === 1 || req.body.is_active === "1";
      }

      await repo.save(policy);
      return res.json({ success: true, message: "Break policy updated", data: policy });
    } catch (err: any) {
      console.error("[BreakPolicyController] update error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update break policy" });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Break Policy", "Delete a break policy")
  async delete(req: any, res: Response) {
    try {
      const repo   = dataSource.getRepository(BreakPolicy);
      const id     = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid policy ID" });

      const policy = await repo.findOne({
        where: TenantService.scopeWhere(req.user, { id }),
      });
      if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
      await repo.remove(policy);
      return res.json({ success: true, message: "Break policy deleted" });
    } catch (err: any) {
      console.error("[BreakPolicyController] delete error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete break policy" });
    }
  }
}
