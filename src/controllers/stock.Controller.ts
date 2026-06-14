import {
  Request,
  Response,
  NextFunction
} from "express";

import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger,
  Delete
} from "../decorators";

import validate from "../middleware/validate";

import { UpdateStockDto } from "../dto/stock.dto";

import { Product } from "../entities/products";
import { LowStockAlert, StockLog } from "../entities/stock";

import { dataSource } from "../server";
import { CreatePaymentDto } from "../dto/payment.dto";
import { Payment } from "../entities/payment";

@Controller("/stock")
export class StockController {

  @Post("/update")
  @Middleware([
    validate(UpdateStockDto)
  ])
  @Swagger(
    "Update Stock",
    "Add or Remove Product Stock"
  )
  async updateStock(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    const qr =
      dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    try {

      const {
        product_id,
        quantity,
        action
      } = req.body;

      const productRepo =
        qr.manager.getRepository(Product);

      const logRepo =
        qr.manager.getRepository(StockLog);

      const product =
        await productRepo.findOne({
          where: { id: product_id }
        });

      if (!product) {

        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const oldStock =
        product.stock;

      if (action === "ADD") {

        product.stock += quantity;
      }

      if (action === "REMOVE") {

        if (
          product.stock < quantity
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Insufficient stock"
          });
        }

        product.stock -= quantity;
      }

      await productRepo.save(product);

      await logRepo.save({
        product_id,
        old_stock: oldStock,
        added_stock: quantity,
        new_stock: product.stock,
        action,
        created_by: 1
      });

      await qr.commitTransaction();

      return res.json({
        success: true,
        data: product
      });

    } catch (err) {

      await qr.rollbackTransaction();
      next(err);

    } finally {

      await qr.release();
    }
  }

  @Get("/logs")
  async logs(
    req: Request,
    res: Response
  ) {

    const logs =
      await dataSource
        .getRepository(StockLog)
        .find({
          order: {
            id: "DESC"
          }
        });

    return res.json({
      success: true,
      data: logs
    });
  }
}

@Controller("/payments")
export class PaymentController {

  @Post("/create")
  @Middleware([
    validate(CreatePaymentDto)
  ])
  @Swagger(
    "Create Payment",
    "Cash / Online Payment"
  )
  async create(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        Payment
      );

    const payment =
      repo.create(req.body);

    await repo.save(payment);

    return res.json({
      success: true,
      data: payment
    });
  }

  @Get("/")
  async getAll(
    req: Request,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(Payment)
        .find({
          order: {
            id: "DESC"
          }
        });

    return res.json({
      success: true,
      data
    });
  }



}


@Controller("/alerts")
export class AlertController {

  // ==========================================
  // GET ALL LOW STOCK ALERTS
  // ==========================================
  @Get("/")
  @Swagger(
    "Get Low Stock Alerts",
    "Fetch all low stock product alerts"
  )
  async getAlerts(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(LowStockAlert);

    const alerts =
      await repo.find({
        order: {
          id: "DESC",
        },
      });

    return res.json({
      success: true,
      data: alerts,
    });
  }


  @Delete("/:id")
async deleteAlert(req: Request, res: Response) {

  const repo = dataSource.getRepository(LowStockAlert);

  await repo.delete(req.params.id);

  return res.json({
    success: true,
    message: "Alert deleted"
  });
}
}