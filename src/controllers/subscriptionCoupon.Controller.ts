import { Request, Response } from "express";
import { Controller, Post, Get, Put, Delete, Middleware, Swagger } from "../decorators";
import validate from "../middleware/validate";
import dataSource from "../config/database";
import { SubscriptionCoupon } from "../entities/subscription-coupon.entity";

@Controller("/subscription-coupons")
export class SubscriptionCouponController {
  
  @Get("/")
  @Swagger("Get All Subscription Coupons", "Returns list of subscription coupons.")
  async getCoupons(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(SubscriptionCoupon);
      const coupons = await repo.find({ order: { created_at: "DESC" } });
      return res.json({ success: true, data: coupons });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/")
  @Swagger("Create Subscription Coupon", "Admin only. Creates a new coupon for subscriptions.")
  async createCoupon(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(SubscriptionCoupon);
      
      const existing = await repo.findOne({ where: { code: req.body.code } });
      if (existing) {
         return res.status(400).json({ success: false, message: "Coupon code already exists" });
      }

      const coupon = repo.create(req.body);
      await repo.save(coupon);
      
      return res.json({ success: true, data: coupon });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/validate")
  @Swagger("Validate Subscription Coupon", "Checks if a coupon is valid for a given plan and company.")
  async validateCoupon(req: Request, res: Response) {
    try {
      const { code, company_id, amount } = req.body;
      const repo = dataSource.getRepository(SubscriptionCoupon);
      
      const coupon = await repo.findOne({ where: { code: code.toUpperCase() } });
      
      if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
      if (!coupon.is_active) return res.status(400).json({ success: false, message: "Coupon is inactive" });
      
      if (coupon.valid_from && new Date() < new Date(coupon.valid_from)) {
        return res.status(400).json({ success: false, message: "Coupon is not yet valid" });
      }
      if (coupon.valid_until && new Date() > new Date(coupon.valid_until)) {
        return res.status(400).json({ success: false, message: "Coupon has expired" });
      }
      if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
        return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }
      if (coupon.company_id_restriction && coupon.company_id_restriction !== company_id) {
        return res.status(400).json({ success: false, message: "Coupon not valid for this company" });
      }
      if (coupon.min_order_value && amount < coupon.min_order_value) {
        return res.status(400).json({ success: false, message: `Minimum order value of ${coupon.min_order_value} required` });
      }

      // Calculate discount
      let discountAmount = 0;
      let extraDays = 0;
      let extraMonths = 0;
      
      switch (coupon.discount_type) {
        case "percentage":
          if (coupon.discount_value) discountAmount = (amount * coupon.discount_value) / 100;
          break;
        case "flat":
          if (coupon.discount_value) discountAmount = coupon.discount_value;
          break;
        case "extra_days":
          if (coupon.discount_value) extraDays = coupon.discount_value;
          break;
        case "extra_months":
          if (coupon.discount_value) extraMonths = coupon.discount_value;
          break;
        case "free_trial_extension":
          if (coupon.free_trial_days) extraDays = coupon.free_trial_days;
          break;
        case "buy_x_get_y":
          // Handled during actual subscription processing, but we pass metadata
          if (coupon.buy_x_months && coupon.get_y_months) {
             extraMonths = coupon.get_y_months;
          }
          break;
        case "renewal":
        case "first_purchase":
        case "referral":
          if (coupon.discount_value) {
            // These typically act as percentage or flat under the hood, assume percentage for now
            // or require front-end mapping. Defaulting to percentage if value < 100
            discountAmount = coupon.discount_value <= 100 ? (amount * coupon.discount_value) / 100 : coupon.discount_value;
          }
          break;
      }

      const finalAmount = Math.max(0, amount - discountAmount);

      return res.json({ 
        success: true, 
        data: {
          coupon,
          original_amount: amount,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          extra_days: extraDays,
          extra_months: extraMonths
        } 
      });

    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

}
