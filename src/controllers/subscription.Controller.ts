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
import { UserType } from "../utils/Role-Access";
import { emitToCompany } from "../socket/socket";

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

  @Get("/current")
  @Swagger("Get Current Subscription", "Returns the active or trialing subscription for the logged-in company.")
  async getCurrentSubscription(req: any, res: Response) {
    try {
      const company_id = req.user?.companyId ?? req.user?.company_id;
      if (!company_id) {
        return res.json({ success: true, data: null, message: "No company context found in user session" });
      }

      const subscription = await dataSource.getRepository(UserSubscription).findOne({
        where: { company_id },
        relations: { plan: true },
        order: { created_at: "DESC" }
      });

      if (!subscription) {
        return res.json({ success: true, data: null, message: "No subscription found" });
      }

      return res.json({ success: true, data: subscription });
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
      const company_id = req.user?.companyId || req.user?.company_id || req.body.company_id || 1; // Fallback for test

      // Duplicate Trial Prevention: Check if company already used a trial or has active subscription
      const userSubRepo = dataSource.getRepository(UserSubscription);
      const existingSub = await userSubRepo.findOne({
        where: { company_id },
        order: { created_at: "DESC" }
      });

      const isSuperAdmin = req.user?.isSuperAdmin === true || req.user?.userType === UserType.SUPER_ADMIN;

      if (existingSub && !isSuperAdmin) {
        if (existingSub.status === "trialing" || existingSub.status === "active" || existingSub.trial_end) {
          return res.status(400).json({
            success: false,
            code: "TRIAL_ALREADY_USED",
            message: "A free trial has already been activated for this company/account. Please purchase a subscription plan to continue."
          });
        }
      }

      const plan = await dataSource.getRepository(SubscriptionPlan).findOne({ where: { id: plan_id, is_active: true } });
      if (!plan) return res.status(404).json({ success: false, message: "Active plan not found" });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (plan.trial_days || 14));

      const newSub = existingSub || userSubRepo.create({ company_id });
      newSub.company_id = company_id;
      newSub.plan_id = plan_id;
      newSub.status = "trialing";
      newSub.billing_cycle = billing_cycle || "yearly";
      newSub.start_date = new Date();
      newSub.end_date = expiryDate;
      newSub.trial_end = expiryDate;

      await userSubRepo.save(newSub);

      // Emit real-time socket event for trial start
      emitToCompany(company_id, "subscription.trial.started", {
        subscription_id: newSub.id,
        company_id,
        status:        "trialing",
        plan_id,
        trial_end:     expiryDate,
        billing_cycle: billing_cycle || "yearly"
      });

      return res.json({
        success: true,
        message: `14-Day Free Trial successfully activated`,
        trialId: `trial_${newSub.id}_${Date.now()}`,
        planId: plan_id,
        expiryDate: expiryDate.toISOString(),
        data: newSub
      });
    } catch (err: any) {
      console.error("Start Trial Error:", err);
      return res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  }

  @Post("/subscribe")
  @Middleware([validate(SubscribeDto)])
  @Swagger("Subscribe to Plan", "Initiates subscription and creates a Razorpay order.")
  async subscribe(req: any, res: Response) {
    try {
      const { plan_id, billing_cycle, coupon_code } = req.body;
      const company_id = req.user?.company_id || req.user?.companyId || req.body.company_id || 1;

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

      // Create or update subscription record
      const subRepo = dataSource.getRepository(UserSubscription);
      let subscription = await subRepo.findOne({
        where: { company_id },
        order: { created_at: "DESC" }
      });
      
      if (!subscription) {
        subscription = subRepo.create({
          company_id,
          plan_id,
          billing_cycle,
          status: "trialing",
          auto_renew: true
        });
        await subRepo.save(subscription);
      } else {
        subscription.plan_id = plan_id;
        subscription.billing_cycle = billing_cycle;
        await subRepo.save(subscription);
      }

      if (amount < 1) {
        return res.status(400).json({ success: false, message: "Minimum amount for Razorpay is 1 INR (100 paise)" });
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
        // discount_amount = original price minus what the customer actually pays
        // Only non-zero when a coupon was actually applied
        discount_amount: applied_coupon_id
          ? Math.max(0, (billing_cycle === "yearly" ? (plan?.yearly_price ?? amount) : (plan?.monthly_price ?? amount)) - amount)
          : 0,
        plan_details: plan,
        coupon_applied: couponDetails,
        customer_details: {
          name:    req.body.name    || null,
          email:   req.body.email   || null,
          phone:   req.body.phone   || null,
          company: req.body.company || null,
          gstin:   req.body.gstin   || null
        },
        company_details: company ? {
          id:   company.id,
          name: (company as any).name || null
        } : null,
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
          razorpay_key_id: orderResult.key_id
        }
      });

    } catch (err: any) {
      console.error("Subscription Order Creation Error:", err);
      const errorMessage = err?.error?.description || err.message || "Failed to create subscription order";
      if (errorMessage.includes("401 Unauthorized") || err?.statusCode === 401) {
         return res.status(401).json({ success: false, message: errorMessage });
      }
      return res.status(500).json({ success: false, message: errorMessage });
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

      await subRepo.save(subscription);

      // ── Reload invoice with relations for the socket payload ──────────────
      const fullInvoice = await invoiceRepo.findOne({
        where: { id: invoice.id },
        relations: { subscription: { plan: true } }
      });

      // ── Emit real-time socket events to the company room ─────────────────
      const activationPayload = {
        subscription_id: subscription.id,
        company_id:      subscription.company_id,
        status:          "active",
        plan:            plan ? { id: plan.id, name: plan.name } : null,
        billing_cycle:   subscription.billing_cycle,
        start_date:      subscription.start_date,
        end_date:        subscription.end_date,
        razorpay_payment_id
      };
      emitToCompany(subscription.company_id, "subscription.activated",     activationPayload);
      emitToCompany(subscription.company_id, "subscription.invoice.created", fullInvoice || invoice);

      return res.json({
        success: true,
        message: "Payment verified successfully. Subscription activated!",
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
      // ── HMAC Signature Verification ──────────────────────────────────
      // Razorpay sends X-Razorpay-Signature with every webhook request.
      // We MUST verify it to prevent spoofed event injection.
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature     = req.headers["x-razorpay-signature"] as string | undefined;

      if (webhookSecret && webhookSecret !== "YourWebhookSecretHere") {
        if (!signature) {
          console.warn("[Webhook] Missing X-Razorpay-Signature header — request rejected");
          return res.status(401).json({ success: false, message: "Missing webhook signature" });
        }

        const crypto = require("crypto");
        // CRITICAL: Use the raw request body bytes for HMAC, NOT re-serialized JSON.
        // express.json() parses the body and re-serializing with JSON.stringify() produces
        // different whitespace/key ordering, causing HMAC mismatch even with the correct secret.
        // The app.ts middleware captures req.rawBody BEFORE express.json() processes it.
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBody)
          .digest("hex");

        if (expectedSignature !== signature) {
          console.warn("[Webhook] Invalid signature — request rejected");
          return res.status(401).json({ success: false, message: "Invalid webhook signature" });
        }
      } else {
        // Webhook secret is not configured — log a warning but continue in dev mode
        if (process.env.NODE_ENV === "production") {
          console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not set. Webhook verification is DISABLED in production!");
        } else {
          console.warn("[Webhook] Signature verification skipped (development mode or secret not configured)");
        }
      }

      const payload   = req.body;
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
         const rzpSubscriptionId = payload?.payload?.subscription?.entity?.id || payload?.payload?.payment?.entity?.subscription_id;
         if (rzpSubscriptionId) {
            const subRepo = dataSource.getRepository(UserSubscription);
            const sub = await subRepo.findOne({ where: { razorpay_subscription_id: rzpSubscriptionId } });
            if (sub) {
               // Update status if needed
               if (sub.status !== "active") {
                  sub.status = "active";
               }

               // Extend subscription end date by billing cycle
               const newEndDate = new Date(sub.end_date || new Date());
               if (sub.billing_cycle === "yearly") {
                 newEndDate.setFullYear(newEndDate.getFullYear() + 1);
               } else {
                 newEndDate.setMonth(newEndDate.getMonth() + 1);
               }
               sub.end_date = newEndDate;

               await subRepo.save(sub);

               // Generate an invoice for this charge
               const paymentEntity = payload?.payload?.payment?.entity;
               if (paymentEntity) {
                 const invoiceRepo = dataSource.getRepository(SubscriptionInvoice);
                 const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                 const amount = (paymentEntity.amount || 0) / 100;
                 const gstAmount = amount * 0.18;
                 
                 const invoice = invoiceRepo.create({
                   invoice_number: invoiceNumber,
                   subscription_id: sub.id,
                   company_id: sub.company_id,
                   amount: amount,
                   gst_amount: gstAmount,
                   subtotal: amount - gstAmount,
                   discount_amount: 0,
                   currency: paymentEntity.currency || "INR",
                   status: "paid",
                   razorpay_order_id: paymentEntity.order_id,
                   razorpay_payment_id: paymentEntity.id
                 });
                 await invoiceRepo.save(invoice);
               }
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
