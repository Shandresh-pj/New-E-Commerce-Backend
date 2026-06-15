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
import { StockLog } from "../entities/stock";

import { dataSource } from "../server";
import { CreatePaymentDto } from "../dto/payment.dto";
import { Payment } from "../entities/payment";
import { StockService } from "../services/stock.service";
import { LowStockAlert } from "../entities/lowstock";

@Controller("/stock")
export class StockController {

  @Post("/update")
  @Middleware([validate(UpdateStockDto)])
  @Swagger("Update Stock", "Add / Remove Stock")
  async updateStock(req: Request, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {

      const { product_id, quantity, action } = req.body;

      const result = await StockService.updateStock(
        product_id,
        quantity,
        action,
        1, // user_id (replace with auth user)
        qr.manager
      );

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Stock updated successfully",
        data: result,
      });

    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  @Get("/logs")
  async logs(req: Request, res: Response) {

    const repo = dataSource.getRepository(StockLog);

    const logs = await repo.find({
      order: { id: "DESC" },
    });

    return res.json({
      success: true,
      data: logs,
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