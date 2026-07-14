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
        buy_x, get_y, expiry_date, usage_limit,
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
        usage_limit: usage_limit || null,
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
      const couponRepo = dataSource.getRepository(Coupon);
      const mapRepo = dataSource.getRepository(CouponProduct);

      const coupons = await couponRepo.find({
        where: TenantService.scopeWhere(req.user),
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

      if (coupon.expiry_date && new Date() > coupon.expiry_date) {
        return response.status(400).json({ success: false, message: "Coupon has expired" });
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return response.status(400).json({ success: false, message: "Coupon usage limit reached" });
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
        buy_x, get_y, expiry_date, usage_limit,
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
      if (usage_limit !== undefined) existingCoupon.usage_limit = usage_limit || null;
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
}