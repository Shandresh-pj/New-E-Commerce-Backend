import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import {
  Request,
  Response,
  NextFunction,
} from "express";

import { dataSource } from "../server";
import { Coupon, CouponProduct } from "../entities/coupons";
import validate from "../middleware/validate";
import { CreateCouponDto } from "../dto/coupon.dto";

@Controller("/coupons")
export class CouponController {

  // ================= CREATE COUPON =================
  @Post("/create")
  @Middleware([
    validate(CreateCouponDto)
  ])
  @Swagger("Create Coupon", "Create coupon with product mapping")
  public async create(
    request: Request,
    response: Response,
    next: NextFunction
  ) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const {
        code,
        type,
        value,
        product_ids
      } = request.body;

      const couponRepo =
        queryRunner.manager.getRepository(Coupon);

      const mapRepo =
        queryRunner.manager.getRepository(CouponProduct);

      // ================= CHECK DUPLICATE =================
      const existingCoupon =
        await couponRepo.findOne({
          where: { code }
        });

      if (existingCoupon) {

        await queryRunner.rollbackTransaction();

        return response.status(400).json({
          success: false,
          message: "Coupon already exists"
        });
      }

      // ================= CREATE COUPON =================
      const coupon =
        couponRepo.create({
          code,
          type,
          value,
          is_active: true
        });

      await couponRepo.save(coupon);

      // ================= MAP PRODUCTS =================
      if (product_ids && product_ids.length > 0) {

        for (const productId of product_ids) {

          const map =
            mapRepo.create({
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
  @Swagger("Get Coupons", "Fetch all coupons")
  public async getAll(
    request: Request,
    response: Response,
    next: NextFunction
  ) {

    try {

      const couponRepo =
        dataSource.getRepository(Coupon);

      const mapRepo =
        dataSource.getRepository(CouponProduct);

      const coupons =
        await couponRepo.find({
          order: { id: "DESC" }
        });

      const result = await Promise.all(
        coupons.map(async (coupon) => {

          const mappings =
            await mapRepo.find({
              where: {
                coupon_id: coupon.id
              }
            });

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

  // ================= DELETE COUPON =================
  @Delete("/:id")
  @Swagger("Delete Coupon", "Delete coupon by id")
  public async delete(
    request: Request,
    response: Response,
    next: NextFunction
  ) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const id =
        Number(request.params.id);

      const couponRepo =
        queryRunner.manager.getRepository(Coupon);

      const mapRepo =
        queryRunner.manager.getRepository(CouponProduct);

      const coupon =
        await couponRepo.findOne({
          where: { id }
        });

      if (!coupon) {

        await queryRunner.rollbackTransaction();

        return response.status(404).json({
          success: false,
          message: "Coupon not found"
        });
      }

      // ================= DELETE MAPPINGS FIRST =================
      await mapRepo.delete({
        coupon_id: id
      });

      // ================= DELETE COUPON =================
      await couponRepo.delete(id);

      await queryRunner.commitTransaction();

      return response.json({
        success: true,
        message: "Coupon deleted successfully"
      });

    } catch (error) {

      await queryRunner.rollbackTransaction();
      next(error);

    } finally {

      await queryRunner.release();
    }
  }
}