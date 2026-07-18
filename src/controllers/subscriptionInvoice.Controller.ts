import { Request, Response } from "express";
import { Controller, Post, Get, Put, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";
import dataSource from "../config/database";
import { SubscriptionInvoice } from "../entities/subscription-invoice.entity";

@Controller("/subscription-invoices")
export class SubscriptionInvoiceController {

  @Get("/")
  @Swagger("Get All Subscription Invoices", "Returns list of subscription invoices.")
  async getInvoices(req: any, res: Response) {
    try {
      const company_id = req.user?.company_id || req.query.company_id;
      if (!company_id) return res.status(400).json({ success: false, message: "Company ID is required" });

      const repo = dataSource.getRepository(SubscriptionInvoice);
      const invoices = await repo.find({
        where: { company_id: Number(company_id) },
        order: { created_at: "DESC" },
        relations: { subscription: true }
      });
      return res.json({ success: true, data: invoices });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Get("/:id")
  @Swagger("Get Subscription Invoice Details", "Returns details of a specific subscription invoice.")
  async getInvoiceDetails(req: any, res: Response) {
    try {
      const { id } = req.params;
      const company_id = req.user?.company_id || req.query.company_id;

      const repo = dataSource.getRepository(SubscriptionInvoice);
      const invoice = await repo.findOne({
        where: { id: Number(id), company_id: Number(company_id) },
        relations: { subscription: true, company: true }
      });
      
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

      return res.json({ success: true, data: invoice });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
