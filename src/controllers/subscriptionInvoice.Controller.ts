import { Request, Response } from "express";
import { Controller, Get, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { SubscriptionInvoice } from "../entities/subscription-invoice.entity";

@Controller("/subscription-invoices")
export class SubscriptionInvoiceController {

  // ── Get All Subscription Invoices ──────────────────────────────────────
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get All Subscription Invoices", "Returns list of subscription invoices for the authenticated user/company.")
  async getInvoices(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(SubscriptionInvoice);

      // Super Admin: return all invoices across companies
      if (req.user?.isSuperAdmin) {
        const invoices = await repo.find({
          order: { created_at: "DESC" },
          relations: { subscription: true }
        });
        return res.json({ success: true, data: invoices });
      }

      // Regular User / Admin: resolve company ID safely
      const companyId = req.user?.companyId || req.user?.company_id || req.query.company_id;

      if (!companyId) {
        // Return empty array instead of 400 error when company context is not yet selected
        return res.json({ success: true, data: [] });
      }

      const invoices = await repo.find({
        where: { company_id: Number(companyId) },
        order: { created_at: "DESC" },
        relations: { subscription: true }
      });

      return res.json({ success: true, data: invoices });

    } catch (err: any) {
      console.error("[SubscriptionInvoiceController] getInvoices error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch invoices" });
    }
  }

  // ── Get Single Invoice Details ─────────────────────────────────────────
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Subscription Invoice Details", "Returns details of a specific subscription invoice.")
  async getInvoiceDetails(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid invoice ID" });

      const repo = dataSource.getRepository(SubscriptionInvoice);

      if (req.user?.isSuperAdmin) {
        const invoice = await repo.findOne({
          where: { id },
          relations: { subscription: true }
        });
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
        return res.json({ success: true, data: invoice });
      }

      const companyId = req.user?.companyId || req.user?.company_id || req.query.company_id;
      if (!companyId) return res.status(400).json({ success: false, message: "Company ID is required" });

      const invoice = await repo.findOne({
        where: { id, company_id: Number(companyId) },
        relations: { subscription: true }
      });

      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

      return res.json({ success: true, data: invoice });

    } catch (err: any) {
      console.error("[SubscriptionInvoiceController] getInvoiceDetails error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch invoice details" });
    }
  }
}
