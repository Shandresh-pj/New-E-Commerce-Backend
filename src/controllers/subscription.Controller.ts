import { Request, Response } from "express";
import { Controller, Post, Get, Put, Middleware, Swagger } from "../decorators";
import validate from "../middleware/validate";
import dataSource from "../config/database";
import { SubscriptionPlan } from "../entities/subscription-plan.entity";
import { UserSubscription } from "../entities/user-subscription.entity";
import { SubscriptionInvoice } from "../entities/subscription-invoice.entity";
import { WebhookLog } from "../entities/webhook-log.entity";
import { Company } from "../entities/company";
import { SubscriptionCoupon } from "../entities/subscription-coupon.entity";
import { PaymentContext } from "../core/payment/PaymentContext";
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeDto,
  VerifySubscriptionPaymentDto,
  StartTrialDto,
} from "../dto/subscription.dto";

@Controller("/subscriptions")
export class SubscriptionController {
  
  // ─── PLAN MANAGEMENT ──────────────────────────────────────────────────

  @Get("/plans")
  @Swagger("Get All Subscription Plans", "Returns list of active plans for frontend display.")
  async getPlans(req: Request, res: Response) {
    try {
      const plans = await dataSource.getRepository(SubscriptionPlan).find({
        where: { is_active: true },
        order: { monthly_price: "ASC" },
      });
      return res.json({ success: true, data: plans });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/plans")
  @Middleware([validate(CreateSubscriptionPlanDto)])
  @Swagger("Create Subscription Plan", "Admin only. Creates a new plan.")
  async createPlan(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(SubscriptionPlan);
      const plan = repo.create(req.body);
      await repo.save(plan);
      return res.json({ success: true, data: plan });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Put("/plans/:id")
  @Middleware([validate(UpdateSubscriptionPlanDto)])
  @Swagger("Update Subscription Plan", "Admin only. Updates an existing plan.")
  async updatePlan(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid plan ID. Must be a number." });
      }
      
      const repo = dataSource.getRepository(SubscriptionPlan);
      const plan = await repo.findOne({ where: { id } });
      if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

      Object.assign(plan, req.body);
      await repo.save(plan);
      return res.json({ success: true, data: plan });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ─── SUBSCRIPTION & BILLING ──────────────────────────────────────────

  @Post("/start-trial")
  @Middleware([validate(StartTrialDto)])
  @Swagger("Start 14-Day Free Trial", "Initiates a free 14-day trial without Razorpay.")
  async startTrial(req: any, res: Response) {
    try {
      const { plan_id, billing_cycle } = req.body;
      const company_id = req.user?.company_id || req.body.company_id || 1; // Fallback for test

      const plan = await dataSource.getRepository(SubscriptionPlan).findOne({ where: { id: plan_id, is_active: true } });
      if (!plan) return res.status(404).json({ success: false, message: "Active plan not found" });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (plan.trial_days || 14));

      // In real scenario, create UserSubscription record here
      const userSubRepo = dataSource.getRepository(UserSubscription);
      
      const newSub = userSubRepo.create({
        company_id,
        plan_id,
        status: "trialing",
        billing_cycle,
        start_date: new Date(),
        end_date: expiryDate,
      });
      await userSubRepo.save(newSub);

      return res.json({
        success: true,
        message: `14-Day Free Trial successfully activated`,
        trialId: `trial_${Date.now()}`,
        planId: plan_id,
        expiryDate: expiryDate.toISOString()
      });
    } catch (err: any) {
      console.error("Start Trial Error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  @Post("/subscribe")
  @Middleware([validate(SubscribeDto)])
  @Swagger("Subscribe to Plan", "Initiates subscription and creates a Razorpay order.")
  async subscribe(req: any, res: Response) {
    try {
      const { plan_id, billing_cycle, coupon_code } = req.body;
      const company_id = req.user?.company_id || req.body.company_id; // Support auth middleware or manual body for testing

      if (!company_id) {
        return res.status(400).json({ success: false, message: "Company ID is required" });
      }

      const plan = await dataSource.getRepository(SubscriptionPlan).findOne({ where: { id: plan_id, is_active: true } });
      if (!plan) return res.status(404).json({ success: false, message: "Active plan not found" });

      const company = await dataSource.getRepository(Company).findOne({ where: { id: company_id } });
      if (!company || !company.razorpay_key_id || !company.razorpay_key_secret) {
        // Fallback to system default keys if company doesn't have its own keys
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
           return res.status(400).json({ success: false, message: "Platform Razorpay credentials are not configured" });
        }
      }

      let amount = billing_cycle === "yearly" ? plan.yearly_price : plan.monthly_price;
      
      // Calculate Coupon Discount
      let applied_coupon_id = null;
      let couponDetails = null;

      if (coupon_code) {
         const coupon = await dataSource.getRepository(SubscriptionCoupon).findOne({ where: { code: coupon_code.toUpperCase(), is_active: true } });
         if (coupon) {
            couponDetails = coupon;
            let discountAmount = 0;
            switch (coupon.discount_type) {
              case "percentage":
                if (coupon.discount_value) discountAmount = (amount * coupon.discount_value) / 100;
                break;
              case "flat":
              case "renewal":
              case "first_purchase":
              case "referral":
                if (coupon.discount_value) {
                  discountAmount = coupon.discount_value <= 100 && coupon.discount_type !== "flat" 
                    ? (amount * coupon.discount_value) / 100 
                    : coupon.discount_value;
                }
                break;
            }
            amount = Math.max(0, amount - discountAmount);
            applied_coupon_id = coupon.id;
         }
      }
      
      const rzpKeyId = company?.razorpay_key_id || process.env.RAZORPAY_KEY_ID!;
      const rzpKeySecret = company?.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET!;

      // Create a "pending" subscription
      const subRepo = dataSource.getRepository(UserSubscription);
      let subscription = await subRepo.findOne({ where: { company_id, plan_id, status: "pending" } });
      
      if (!subscription) {
        subscription = subRepo.create({
          company_id,
          plan_id,
          billing_cycle,
          status: "pending",
          auto_renew: true
        });
        await subRepo.save(subscription);
      } else {
        subscription.billing_cycle = billing_cycle;
        await subRepo.save(subscription);
      }

      // 1. Create Razorpay Order
      const paymentContext = new PaymentContext("RAZORPAY");
      const strategy = paymentContext.getStrategy();

      const orderResult = await strategy.createOrder(
        Number(amount),
        plan.currency || "INR",
        `sub_${subscription.id}_${Date.now()}`,
        { key_id: rzpKeyId, key_secret: rzpKeySecret }
      );

      // 2. Create pending SubscriptionInvoice
      const invoiceRepo = dataSource.getRepository(SubscriptionInvoice);
      
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const gstAmount = amount * 0.18; // Assuming 18% GST for invoice calculation
      const subtotal = amount - gstAmount;

      const invoice = invoiceRepo.create({
        invoice_number: invoiceNumber,
        subscription_id: subscription.id,
        company_id,
        amount: Number(amount),
        gst_amount: gstAmount,
        subtotal: subtotal,
        discount_amount: (plan?.yearly_price || amount) - amount, // Roughly total discount
        plan_details: plan,
        coupon_applied: couponDetails,
        currency: plan?.currency || "INR",
        status: "pending",
        razorpay_order_id: orderResult.order_id
      });
      await invoiceRepo.save(invoice);

      return res.json({
        success: true,
        data: {
          subscription_id: subscription.id,
          invoice_id: invoice.id,
          razorpay_order_id: orderResult.order_id,
          amount: amount,
          currency: orderResult.currency,
          razorpay_key_id: rzpKeyId
        }
      });

    } catch (err: any) {
      console.error("Subscription Order Creation Error:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create subscription order" });
    }
  }

  @Post("/verify")
  @Middleware([validate(VerifySubscriptionPaymentDto)])
  @Swagger("Verify Subscription Payment", "Verifies Razorpay signature and activates subscription.")
  async verifyPayment(req: any, res: Response) {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

      const invoiceRepo = dataSource.getRepository(SubscriptionInvoice);
      const invoice = await invoiceRepo.findOne({ where: { razorpay_order_id }, relations: { subscription: true, company: true } });

      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found for this order ID" });
      }

      if (invoice.status === "paid") {
         return res.json({ success: true, message: "Payment already verified" });
      }

      const rzpKeySecret = invoice.company?.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET!;

      const paymentContext = new PaymentContext("RAZORPAY");
      const strategy = paymentContext.getStrategy();

      const isVerified = await strategy.verifyPayment(
        {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          signature: razorpay_signature
        },
        { key_secret: rzpKeySecret }
      );

      if (!isVerified) {
        invoice.status = "failed";
        await invoiceRepo.save(invoice);
        return res.status(400).json({ success: false, message: "Payment signature verification failed" });
      }

      // Mark Invoice as Paid
      invoice.status = "paid";
      invoice.razorpay_payment_id = razorpay_payment_id;
      invoice.razorpay_signature = razorpay_signature;
      await invoiceRepo.save(invoice);

      // Activate Subscription
      const subRepo = dataSource.getRepository(UserSubscription);
      const subscription = invoice.subscription;
      
      const plan = await dataSource.getRepository(SubscriptionPlan).findOne({ where: { id: subscription.plan_id } });
      const trialDays = plan?.trial_days || 0;
      
      const startDate = new Date();
      let extraMonths = 0;
      let extraDays = 0;

      if (invoice.coupon_applied) {
         const coupon = invoice.coupon_applied;
         if (coupon.discount_type === "extra_months" && coupon.discount_value) extraMonths = coupon.discount_value;
         if (coupon.discount_type === "extra_days" && coupon.discount_value) extraDays = coupon.discount_value;
         if (coupon.discount_type === "free_trial_extension" && coupon.free_trial_days) extraDays = coupon.free_trial_days;
         if (coupon.discount_type === "buy_x_get_y" && coupon.get_y_months) extraMonths = coupon.get_y_months;
         
         // increment coupon usage
         const couponRepo = dataSource.getRepository(SubscriptionCoupon);
         const dbCoupon = await couponRepo.findOne({ where: { id: coupon.id } });
         if (dbCoupon) {
            dbCoupon.used_count += 1;
            await couponRepo.save(dbCoupon);
         }
      }

      let endDate = new Date();
      if (subscription.billing_cycle === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1 + Math.floor(extraMonths / 12));
        endDate.setMonth(endDate.getMonth() + (extraMonths % 12));
      } else {
        endDate.setMonth(endDate.getMonth() + 1 + extraMonths);
      }
      if (extraDays > 0) endDate.setDate(endDate.getDate() + extraDays);

      // Handle Upgrade/Downgrade Tracking
      if (subscription.status === "active" && plan) {
        if (subscription.plan_id < plan.id) {
           subscription.upgraded_at = new Date();
        } else if (subscription.plan_id > plan.id) {
           subscription.downgraded_at = new Date();
        }
      }

      subscription.status = "active";
      subscription.start_date = startDate;
      subscription.end_date = endDate;
      
      if (trialDays > 0) {
         subscription.status = "trialing";
         const trialEnd = new Date();
         trialEnd.setDate(trialEnd.getDate() + trialDays + extraDays);
         subscription.trial_end = trialEnd;
      }

      await subRepo.save(subscription);

      return res.json({
        success: true,
        message: "Subscription activated successfully",
        data: subscription
      });

    } catch (err: any) {
      console.error("Subscription Verification Error:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to verify subscription payment" });
    }
  }

  // ─── UPGRADE / DOWNGRADE / CANCEL ────────────────────────────────────────

  @Post("/cancel")
  @Swagger("Cancel Subscription", "Cancels an active subscription.")
  async cancelSubscription(req: any, res: Response) {
    try {
      const { subscription_id, reason } = req.body;
      const company_id = req.user?.company_id || req.body.company_id;

      const subRepo = dataSource.getRepository(UserSubscription);
      const subscription = await subRepo.findOne({ where: { id: subscription_id, company_id } });

      if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

      subscription.status = "canceled";
      subscription.canceled_at = new Date();
      subscription.cancellation_reason = reason;
      subscription.auto_renew = false;

      await subRepo.save(subscription);

      return res.json({ success: true, message: "Subscription successfully canceled" });
    } catch (err: any) {
      console.error("Cancel Subscription Error:", err);
      return res.status(500).json({ success: false, message: "Failed to cancel subscription" });
    }
  }

  // ─── WEBHOOKS ────────────────────────────────────────────────────────

  @Post("/webhook")
  @Swagger("Razorpay Webhook", "Idempotent handler for Razorpay subscription events.")
  async webhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      const eventType = payload?.event;
      
      const eventId = req.headers["x-razorpay-event-id"] as string || payload?.id;
      
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
      if (eventType === "subscription.charged" || eventType === "payment.captured") {
         const rzpSubscriptionId = payload?.payload?.subscription?.entity?.id;
         if (rzpSubscriptionId) {
            const subRepo = dataSource.getRepository(UserSubscription);
            const sub = await subRepo.findOne({ where: { razorpay_subscription_id: rzpSubscriptionId } });
            if (sub && sub.status !== "active") {
               sub.status = "active";
               await subRepo.save(sub);
            }
         }
      } else if (eventType === "subscription.halted" || eventType === "subscription.cancelled") {
         const rzpSubscriptionId = payload?.payload?.subscription?.entity?.id;
         if (rzpSubscriptionId) {
            const subRepo = dataSource.getRepository(UserSubscription);
            const sub = await subRepo.findOne({ where: { razorpay_subscription_id: rzpSubscriptionId } });
            if (sub) {
               sub.status = "canceled";
               sub.auto_renew = false;
               sub.canceled_at = new Date();
               sub.cancellation_reason = "Razorpay Webhook: " + eventType;
               await subRepo.save(sub);
            }
         }
      }

      await webhookRepo.save(log);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Webhook Error:", err);
      return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
  }

}
