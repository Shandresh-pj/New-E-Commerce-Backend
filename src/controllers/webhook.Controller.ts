import { Request, Response } from "express";
import { Controller, Post, Middleware, Swagger } from "../decorators";
import dataSource from "../config/database";
import { WebhookLog } from "../entities/webhook-log.entity";
import { verifyRazorpayWebhook } from "../middleware/razorpayWebhook";

@Controller("/webhooks")
export class WebhookController {
  
  @Post("/razorpay")
  @Middleware([verifyRazorpayWebhook])
  @Swagger("Razorpay Webhook", "Idempotent handler for all Razorpay subscription and payment events.")
  async razorpayWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      const eventType = payload?.event;
      const eventId = req.headers["x-razorpay-event-id"] as string || null;
      
      const webhookRepo = dataSource.getRepository(WebhookLog);
      
      if (eventId) {
        const existing = await webhookRepo.findOne({ where: { event_id: eventId } });
        if (existing) {
           return res.json({ success: true, message: "Webhook already processed" });
        }
      }

      const log = webhookRepo.create({
        event_type: eventType || "unknown",
        event_id: eventId,
        payload: payload,
        processed_status: "success"
      });

      // Handle specific events
      // To be implemented: subscription.charged, subscription.halted, payment.captured, etc.

      await webhookRepo.save(log);

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Webhook Processing Error:", err);
      return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
  }
}
