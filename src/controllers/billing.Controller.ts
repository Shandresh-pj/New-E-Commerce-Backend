import { Request, Response } from "express";
import { Controller, Get, Post, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";
import dataSource from "../config/database";
import { BillingHistory } from "../entities/billing-history.entity";
import { SubscriptionInvoice } from "../entities/subscription-invoice.entity";
import { Refund } from "../entities/refund.entity";
import { razorpayService } from "../services/razorpay.service";

@Controller("/billing")
export class BillingController {
  
  @Get("/history")
  @Middleware([authenticateMiddleware, authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH] })])
  @Swagger("Get Billing History", "Returns the billing history and invoices for the authenticated company.")
  async getBillingHistory(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(SubscriptionInvoice);

      if (req.user?.isSuperAdmin) {
        const invoices = await repo.find({
          relations: { subscription: { plan: true } },
          order: { created_at: "DESC" }
        });
        return res.json({ success: true, data: invoices });
      }

      const company_id = req.user?.companyId || req.user?.company_id;
      if (!company_id) {
        return res.json({ success: true, data: [] });
      }

      const invoices = await repo.find({
        where: { company_id: Number(company_id) },
        relations: { subscription: { plan: true } },
        order: { created_at: "DESC" }
      });

      return res.json({ success: true, data: invoices });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/refund")
  @Middleware([authenticateMiddleware, authorize({ roles: [UserType.SUPER_ADMIN] })])
  @Swagger("Refund Payment", "Initiates a full or partial refund for a subscription invoice.")
  async processRefund(req: any, res: Response) {
    try {
      const { invoice_id, amount, reason } = req.body;
      const company_id = req.user?.company_id;

      if (!invoice_id || !company_id) {
        return res.status(400).json({ success: false, message: "Invoice ID and Company ID are required" });
      }

      const invoiceRepo = dataSource.getRepository(SubscriptionInvoice);
      const invoice = await invoiceRepo.findOne({ where: { id: invoice_id, company_id } });

      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
      if (invoice.status !== "paid" || !invoice.razorpay_payment_id) {
        return res.status(400).json({ success: false, message: "Invoice is not eligible for refund" });
      }

      // Process Refund via Razorpay Service
      const refundResult = await razorpayService.refundPayment(invoice.razorpay_payment_id, amount);

      // Save Refund Record
      const refundRepo = dataSource.getRepository(Refund);
      const refund = refundRepo.create({
        transaction_id: invoice.id,
        company_id,
        razorpay_refund_id: refundResult.id,
        amount: amount || invoice.amount,
        refund_type: amount && amount < invoice.amount ? "partial" : "full",
        status: "processed",
        reason: reason || "Customer request"
      });
      await refundRepo.save(refund);

      if (!amount || amount === invoice.amount) {
        invoice.status = "refunded";
        await invoiceRepo.save(invoice);
      }

      return res.json({ success: true, data: refund });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

}
