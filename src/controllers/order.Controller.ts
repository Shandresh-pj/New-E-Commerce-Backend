import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  Controller,
  Post,
  Get,
  Delete,
  Swagger,
  Middleware,
} from "../decorators";

import { dataSource } from "../server";

import {
  Order,
  OrderItem,
} from "../entities/order";

import {
  Coupon,
  CouponProduct,
} from "../entities/coupons";

import { Product } from "../entities/products";

import validate from "../middleware/validate";
import { CreateOrderDto } from "../dto/order.dto";

@Controller("/orders")
export class OrderController {

  // ==========================================
  // DISCOUNT ENGINE
  // ==========================================
  private calculateDiscount(
    coupon: Coupon,
    items: any[],
    allowedIds: number[]
  ): number {

    let discount = 0;

    const eligibleItems = items.filter(
      (item) =>
        allowedIds.includes(item.product_id)
    );

    const eligibleSubtotal =
      eligibleItems.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
            Number(item.quantity),
        0
      );

    // Percentage
    if (coupon.type === "percent") {

      discount =
        (eligibleSubtotal *
          Number(coupon.value)) /
        100;
    }

    // Flat Amount
    else if (coupon.type === "flat") {

      discount = Number(coupon.value);
    }

    // Buy One Get One
    else if (coupon.type === "bogo") {

      for (const item of eligibleItems) {

        const freeQty =
          Math.floor(
            Number(item.quantity) / 2
          );

        discount +=
          freeQty * Number(item.price);
      }
    }

    // Buy X Get Y
    else if (
      coupon.type === "buy_x_get_y"
    ) {

      const x =
        Number(
          (coupon as any).buy_x ?? 2
        );

      const y =
        Number(
          (coupon as any).get_y ?? 1
        );

      for (const item of eligibleItems) {

        const sets = Math.floor(
          Number(item.quantity) /
            (x + y)
        );

        discount +=
          sets *
          y *
          Number(item.price);
      }
    }

    return discount;
  }

  // ==========================================
  // CREATE ORDER
  // ==========================================
  @Post("/create")
  @Middleware([
    validate(CreateOrderDto),
  ])
  @Swagger(
    "Create Order",
    "Create order with coupon and payment"
  )
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const {
        user_id,
        items,
        coupon_code,
        payment,
      } = req.body;

      const orderRepo =
        queryRunner.manager.getRepository(
          Order
        );

      const itemRepo =
        queryRunner.manager.getRepository(
          OrderItem
        );

      const productRepo =
        queryRunner.manager.getRepository(
          Product
        );

      const couponRepo =
        queryRunner.manager.getRepository(
          Coupon
        );

      const cpRepo =
        queryRunner.manager.getRepository(
          CouponProduct
        );

      // ======================================
      // VALIDATE STOCK
      // ======================================

      for (const item of items) {

        const product =
          await productRepo.findOne({
            where: {
              id: item.product_id,
            },
          });

        if (!product) {

          await queryRunner.rollbackTransaction();

          return res.status(404).json({
            success: false,
            message:
              `Product ID ${item.product_id} not found`,
          });
        }

        if (
          Number(product.stock) <
          Number(item.quantity)
        ) {

          await queryRunner.rollbackTransaction();

          return res.status(400).json({
            success: false,
            message:
              `${product.name} only has ${product.stock} stock available`,
          });
        }
      }

      // ======================================
      // SUBTOTAL
      // ======================================

      const subtotal =
        items.reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            Number(item.price) *
              Number(item.quantity),
          0
        );

      let discount = 0;

      // ======================================
      // APPLY COUPON
      // ======================================

      if (coupon_code) {

        const coupon =
          await couponRepo.findOne({
            where: {
              code: coupon_code,
              is_active: true,
            },
          });

        if (coupon) {

          const mappings =
            await cpRepo.find({
              where: {
                coupon_id: coupon.id,
              },
            });

          const allowedIds =
            mappings.map(
              (m) => m.product_id
            );

          discount =
            this.calculateDiscount(
              coupon,
              items,
              allowedIds
            );
        }
      }

      // ======================================
      // TOTAL
      // ======================================

      const total = Math.max(
        0,
        subtotal - discount
      );

      // ======================================
      // CREATE ORDER
      // ======================================

      const order =
        orderRepo.create({
          user_id,
          subtotal,
          discount,
          total,

          payment_method:
            payment?.method,

          payment_status:
            payment?.status,

          transaction_id:
            payment?.transaction_id,

          payment_gateway:
            payment?.gateway,
        });

      await orderRepo.save(order);

      // ======================================
      // SAVE ITEMS
      // ======================================

      const stockUpdate: any[] = [];

      for (const item of items) {

        await itemRepo.save({

          order_id: order.id,

          product_id:
            item.product_id,

          price: item.price,

          quantity:
            item.quantity,
        });

        const product =
          await productRepo.findOne({
            where: {
              id: item.product_id,
            },
          });

        if (product) {

          product.stock =
            Number(product.stock) -
            Number(item.quantity);

          await productRepo.save(
            product
          );

          stockUpdate.push({
            product_id:
              product.id,

            product_name:
              product.name,

            remaining_stock:
              product.stock,
          });
        }
      }

      await queryRunner.commitTransaction();

      return res.status(201).json({
        success: true,
        message:
          "Order created successfully",

        data: {
          order,

          breakdown: {
            subtotal,
            discount,
            total,
          },

          payment,

          stock_update:
            stockUpdate,
        },
      });

    } catch (error) {

      await queryRunner.rollbackTransaction();

      next(error);

    } finally {

      await queryRunner.release();
    }
  }

  // ==========================================
  // GET ALL ORDERS
  // ==========================================
  @Get("/")
  @Swagger(
    "Get Orders",
    "Get all orders"
  )
  public async getAll(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        Order
      );

    const orders =
      await repo.find({
        relations: {
          user: true,
          items: true,
        },

        order: {
          id: "DESC",
        },
      });

    return res.json({
      success: true,
      data: orders,
    });
  }

  // ==========================================
  // GET ORDER BY ID
  // ==========================================
  @Get("/:id")
  @Swagger(
    "Get Order",
    "Get order by id"
  )
  public async getById(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        Order
      );

    const order =
      await repo.findOne({
        where: {
          id: Number(
            req.params.id
          ),
        },

        relations: {
          user: true,
          items: true,
        },
      });

    if (!order) {

      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  }

  // ==========================================
  // DELETE ORDER
  // ==========================================
  @Delete("/:id")
  @Swagger(
    "Delete Order",
    "Delete order by id"
  )
  public async delete(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        Order
      );

    const order =
      await repo.findOne({
        where: {
          id: Number(
            req.params.id
          ),
        },
      });

    if (!order) {

      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    await repo.delete(order.id);

    return res.json({
      success: true,
      message:
        "Order deleted successfully",
    });
  }
}