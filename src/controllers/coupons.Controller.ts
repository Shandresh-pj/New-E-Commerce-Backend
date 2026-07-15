import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Middleware,
  Swagger,
} from "../decorators";

import {
  Request,
  Response,
  NextFunction,
} from "express";

import dataSource from "../config/database";
import { Like } from "typeorm";
import { Coupon, CouponProduct } from "../entities/coupons";
import validate from "../middleware/validate";
import { CreateCouponDto } from "../dto/coupon.dto";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { auditMiddleware } from "../middleware/audit.Middleware";

@Controller("/coupons")
export class CouponController {

  // ================= CREATE COUPON =================
  @Post("/create")
  @Middleware([
    authenticateMiddleware,
    auditMiddleware("COUPONS"),
    validate(CreateCouponDto)
  ])
  @Swagger("Create Coupon", "Create coupon with product mapping and tenant isolation")
  public async create(req: any, response: Response, next: NextFunction) {

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        code, type, value, product_ids,
        buy_x, get_y, expiry_date, start_date, usage_limit, per_user_limit,
        company_id, branch_id
      } = req.body;

      const couponRepo = queryRunner.manager.getRepository(Coupon);
      const mapRepo = queryRunner.manager.getRepository(CouponProduct);

      // Check Duplicate Code
      const existingCoupon = await couponRepo.findOne({ where: { code } });
      if (existingCoupon) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({ success: false, message: "Coupon code already exists" });
      }

      // Create Coupon
      const coupon = couponRepo.create({
        code,
        type,
        value,
        buy_x,
        get_y,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        start_date: start_date ? new Date(start_date) : null,
        usage_limit: usage_limit || null,
        per_user_limit: per_user_limit || null,
        company_id: company_id ?? req.user.companyId,
        branch_id: branch_id ?? req.user.branchId,
        created_by: req.user.userId,
        is_active: true
      });

      await couponRepo.save(coupon);

      // Map Products
      if (product_ids && product_ids.length > 0) {
        for (const productId of product_ids) {
          const map = mapRepo.create({
            coupon_id: coupon.id,
            product_id: productId
          });
          await mapRepo.save(map);
        }
      }

      await queryRunner.commitTransaction();

      return response.status(201).json({
        success: true,
        message: "Coupon created successfully",
        data: coupon
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      next(error);
    } finally {
      await queryRunner.release();
    }
  }

  // ================= GET ALL COUPONS =================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Coupons", "Fetch all coupons with tenant scoping")
  public async getAll(req: any, response: Response, next: NextFunction) {
    try {
      const { search, is_active } = req.query;
      const couponRepo = dataSource.getRepository(Coupon);
      const mapRepo = dataSource.getRepository(CouponProduct);

      const where: any = { ...TenantService.scopeWhere(req.user) };
      if (is_active !== undefined && is_active !== "") {
        where.is_active = is_active === "true" || is_active === true;
      }
      if (search && typeof search === "string" && search.trim() !== "") {
        where.code = Like(`%${search.trim()}%`);
      }

      const coupons = await couponRepo.find({
        where,
        order: { id: "DESC" }
      });

      const result = await Promise.all(
        coupons.map(async (coupon) => {
          const mappings = await mapRepo.find({ where: { coupon_id: coupon.id } });
          return {
            ...coupon,
            product_ids: mappings.map(m => m.product_id)
          };
        })
      );

      return response.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  // ================= VALIDATE COUPON =================
  @Post("/validate")
  @Middleware([authenticateMiddleware])
  @Swagger("Validate Coupon", "Validate a coupon for use")
  public async validateCoupon(req: any, response: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      if (!code) {
        return response.status(400).json({ success: false, message: "Coupon code is required" });
      }

      const couponRepo = dataSource.getRepository(Coupon);
      const coupon = await couponRepo.findOne({
        where: TenantService.scopeWhere(req.user, { code })
      });

      if (!coupon) {
        return response.status(404).json({ success: false, message: "Invalid coupon code" });
      }

      if (!coupon.is_active) {
        return response.status(400).json({ success: false, message: "Coupon is no longer active" });
      }

      if (coupon.start_date && new Date() < coupon.start_date) {
        return response.status(400).json({ success: false, message: "Coupon is not yet active" });
      }

      if (coupon.expiry_date && new Date() > coupon.expiry_date) {
        return response.status(400).json({ success: false, message: "Coupon has expired" });
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return response.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }

      if (coupon.per_user_limit && coupon.per_user_limit > 0) {
        const userId = req.body.user_id || req.user?.userId;
        if (userId) {
          const orderRepo = dataSource.getRepository("Order");
          const userUsage = await orderRepo.count({
            where: { user_id: userId, coupon_id: coupon.id }
          });
          if (userUsage >= coupon.per_user_limit) {
            return response.status(400).json({ success: false, message: "You have reached your usage limit for this coupon" });
          }
        }
      }

      // Fetch product restrictions
      const mapRepo = dataSource.getRepository(CouponProduct);
      const mappings = await mapRepo.find({ where: { coupon_id: coupon.id } });
      const product_ids = mappings.map(m => m.product_id);

      return response.json({
        success: true,
        message: "Coupon is valid",
        data: {
          ...coupon,
          product_ids
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= UPDATE COUPON =================
  @Put("/:id")
  @Middleware([authenticateMiddleware, auditMiddleware("COUPONS")])
  @Swagger("Update Coupon", "Update coupon and product mappings by id with tenant scoping")
  public async update(req: any, response: Response, next: NextFunction) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const id = Number(req.params.id);
      const {
        code, type, value, product_ids,
        buy_x, get_y, expiry_date, start_date, usage_limit, per_user_limit,
        is_active
      } = req.body;

      const couponRepo = queryRunner.manager.getRepository(Coupon);
      const mapRepo = queryRunner.manager.getRepository(CouponProduct);

      const existingCoupon = await couponRepo.findOne({
        where: TenantService.scopeWhere(req.user, { id })
      });

      if (!existingCoupon) {
        await queryRunner.rollbackTransaction();
        return response.status(404).json({ success: false, message: "Coupon not found" });
      }

      if (code && code !== existingCoupon.code) {
        const duplicate = await couponRepo.findOne({ where: { code } });
        if (duplicate && duplicate.id !== id) {
          await queryRunner.rollbackTransaction();
          return response.status(400).json({ success: false, message: "Coupon code already exists" });
        }
        existingCoupon.code = code;
      }

      if (type !== undefined) existingCoupon.type = type;
      if (value !== undefined) existingCoupon.value = value;
      if (buy_x !== undefined) existingCoupon.buy_x = buy_x;
      if (get_y !== undefined) existingCoupon.get_y = get_y;
      if (expiry_date !== undefined) existingCoupon.expiry_date = expiry_date ? new Date(expiry_date) : null;
      if (start_date !== undefined) existingCoupon.start_date = start_date ? new Date(start_date) : null;
      if (usage_limit !== undefined) existingCoupon.usage_limit = usage_limit || null;
      if (per_user_limit !== undefined) existingCoupon.per_user_limit = per_user_limit || null;
      if (is_active !== undefined) existingCoupon.is_active = is_active;

      await couponRepo.save(existingCoupon);

      if (Array.isArray(product_ids)) {
        await mapRepo.delete({ coupon_id: id });
        for (const productId of product_ids) {
          const map = mapRepo.create({
            coupon_id: id,
            product_id: productId
          });
          await mapRepo.save(map);
        }
      }

      await queryRunner.commitTransaction();

      return response.json({
        success: true,
        message: "Coupon updated successfully",
        data: existingCoupon
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      next(error);
    } finally {
      await queryRunner.release();
    }
  }

  // ================= DELETE COUPON =================
  @Delete("/:id")
  @Middleware([authenticateMiddleware, auditMiddleware("COUPONS")])
  @Swagger("Delete Coupon", "Delete coupon by id")
  public async delete(req: any, response: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const couponRepo = dataSource.getRepository(Coupon);

      const coupon = await couponRepo.findOne({
        where: TenantService.scopeWhere(req.user, { id })
      });

      if (!coupon) {
        return response.status(404).json({ success: false, message: "Coupon not found" });
      }

      await couponRepo.delete(id);

      return response.json({
        success: true,
        message: "Coupon deleted successfully"
      });

    } catch (error) {
      next(error);
    }
  }

  // ================= CALCULATE COUPON DISCOUNT =================
  @Post("/calculate")
  @Middleware([authenticateMiddleware])
  @Swagger("Calculate Coupon Discount", "Calculate discount and total for given items and coupon code")
  public async calculate(req: any, response: Response, next: NextFunction) {
    try {
      const { code, items, user_id } = req.body;
      if (!code) {
        return response.status(400).json({ success: false, message: "Coupon code is required" });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return response.status(400).json({ success: false, message: "Order items are required" });
      }

      const couponRepo = dataSource.getRepository(Coupon);
      const coupon = await couponRepo.findOne({
        where: TenantService.scopeWhere(req.user, { code })
      });

      if (!coupon) {
        return response.status(404).json({ success: false, message: "Invalid coupon code" });
      }
      if (!coupon.is_active) {
        return response.status(400).json({ success: false, message: "Coupon is no longer active" });
      }
      if (coupon.start_date && new Date() < coupon.start_date) {
        return response.status(400).json({ success: false, message: "Coupon is not yet active" });
      }
      if (coupon.expiry_date && new Date() > coupon.expiry_date) {
        return response.status(400).json({ success: false, message: "Coupon has expired" });
      }
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return response.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }

      const userId = user_id || req.user?.userId;
      if (coupon.per_user_limit && coupon.per_user_limit > 0 && userId) {
        const orderRepo = dataSource.getRepository("Order");
        const userUsage = await orderRepo.count({
          where: { user_id: userId, coupon_id: coupon.id }
        });
        if (userUsage >= coupon.per_user_limit) {
          return response.status(400).json({ success: false, message: "You have reached your usage limit for this coupon" });
        }
      }

      // Fetch mappings
      const mapRepo = dataSource.getRepository(CouponProduct);
      const mappings = await mapRepo.find({ where: { coupon_id: coupon.id } });
      const allowedIds = mappings.map(m => m.product_id);

      // Calculate discount
      let subtotal = 0;
      for (const item of items) {
        subtotal += Number(item.price || 0) * Number(item.quantity || 1);
      }

      let discount = 0;
      const eligibleItems = allowedIds.length > 0
        ? items.filter((i: any) => allowedIds.includes(Number(i.product_id)))
        : items;

      const eligibleSubtotal = eligibleItems.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

      if (coupon.type === "percent") {
        discount = (eligibleSubtotal * Number(coupon.value)) / 100;
      } else if (coupon.type === "flat") {
        discount = Number(coupon.value);
      } else if (coupon.type === "bogo") {
        const x = Number(coupon.buy_x ?? 1);
        const y = Number(coupon.get_y ?? 1);
        for (const item of eligibleItems) {
          const sets = Math.floor(Number(item.quantity || 1) / (x + y));
          discount += sets * y * Number(item.price || 0);
        }
      } else if (coupon.type === "free_shipping") {
        discount = 0;
      }

      const total = Math.max(0, subtotal - discount);

      return response.json({
        success: true,
        message: "Coupon discount calculated successfully",
        data: {
          subtotal,
          discount,
          total,
          coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= TOGGLE STATUS =================
  @Put("/:id/status")
  @Middleware([authenticateMiddleware, auditMiddleware("COUPONS")])
  @Swagger("Toggle Coupon Status", "Toggle active/inactive status of coupon")
  public async toggleStatus(req: any, response: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const couponRepo = dataSource.getRepository(Coupon);
      const coupon = await couponRepo.findOne({
        where: TenantService.scopeWhere(req.user, { id })
      });
      if (!coupon) {
        return response.status(404).json({ success: false, message: "Coupon not found" });
      }
      if (req.body.is_active !== undefined) {
        coupon.is_active = req.body.is_active;
      } else {
        coupon.is_active = !coupon.is_active;
      }
      await couponRepo.save(coupon);
      return response.json({
        success: true,
        message: `Coupon status updated to ${coupon.is_active ? 'Active' : 'Inactive'}`,
        data: coupon
      });
    } catch (error) {
      next(error);
    }
  }
}