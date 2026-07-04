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
import { UserType } from "../utils/Role-Access";
import { Notification } from "../entities/notification";
import { io } from "../socket/socket";

@Controller("/stock")
export class StockController {

  @Post("/update")
  @Middleware([validate(UpdateStockDto)])
  @Swagger("Update Stock", "Add / Remove Stock")
  async updateStock(req: any, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const { product_id, quantity, action } = req.body;

      const user = req.user;
      const isApproved = user?.isSuperAdmin || user?.userType === UserType.SUPER_ADMIN || user?.userType === UserType.ADMIN;

      const result = await StockService.updateStock(
        product_id,
        quantity,
        action,
        user?.userId || user?.id || 1,
        qr.manager,
        isApproved
      );

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: isApproved ? "Stock updated successfully" : "Stock update request submitted for approval",
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

  // ================= APPROVE STOCK ADJUSTMENT =================
  async approveStock(req: any, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const logId = Number(req.params.id);
      const { action, rejection_reason } = req.body; // action: 'APPROVE' | 'REJECT'

      const logRepo = qr.manager.getRepository(StockLog);
      const log = await logRepo.findOneBy({ id: logId });

      if (!log) {
        throw new Error("Stock log not found");
      }

      if (log.status !== "Pending Approval") {
        throw new Error("This stock adjustment is not pending approval");
      }

      const productRepo = qr.manager.getRepository(Product);
      const product = await productRepo.findOneBy({ id: log.product_id });
      if (!product) {
        throw new Error("Product not found");
      }

      const user = req.user;
      const userId = user?.userId || user?.id || 1;

      if (action === "APPROVE") {
        // Apply stock adjustment to product
        const quantity = Math.abs(log.added_stock);
        if (log.action === "ADD") {
          product.stock += quantity;
        } else {
          if (product.stock < quantity) {
            throw new Error("Insufficient stock to approve removal");
          }
          product.stock -= quantity;
        }

        await productRepo.save(product);

        log.status = "Approved";
        log.new_stock = product.stock;
        log.approved_by = userId;
        log.approved_at = new Date();
      } else if (action === "REJECT") {
        log.status = "Rejected";
        log.rejection_reason = rejection_reason || "No reason provided";
        log.rejected_by = userId;
        log.rejected_at = new Date();
      } else {
        throw new Error("Invalid action");
      }

      await logRepo.save(log);
      await qr.commitTransaction();

      // Emit realtime socket event
      io.emit("stock-update", {
        log_id: log.id,
        product_id: product.id,
        product_name: product.name,
        old_stock: log.old_stock,
        new_stock: log.new_stock,
        added_stock: log.added_stock,
        action: log.action,
        status: log.status
      });

      // If approved, trigger low stock checks
      if (action === "APPROVE") {
        const threshold = product.low_stock_threshold || 5;
        const criticalThreshold = product.critical_stock_threshold || 2;
        let alertType: string | null = null;
        if (product.stock <= 0) {
          alertType = "OUT_OF_STOCK";
        } else if (product.stock <= criticalThreshold) {
          alertType = "CRITICAL_STOCK";
        } else if (product.stock <= threshold) {
          alertType = "LOW_STOCK";
        }

        if (alertType) {
          try {
            const alertRepo = dataSource.getRepository(LowStockAlert);
            await alertRepo.save({
              product_id: product.id,
              product_name: product.name,
              current_stock: product.stock,
              threshold,
            });

            const notificationRepo = dataSource.getRepository(Notification);
            const notification = await notificationRepo.save({
              message: `Product "${product.name}" has reached ${alertType.replace('_', ' ')}: current stock ${product.stock}`,
              type: alertType,
              product_id: product.id,
              quantity: product.stock,
            });

            io.emit("low-stock-alert", {
              product_id: product.id,
              product_name: product.name,
              stock: product.stock,
              threshold,
              type: alertType,
            });

            io.emit("new-notification", notification);
          } catch (alertErr) {
            console.error("Alert save error in approval:", alertErr);
          }
        }
      }

      // Notification for approval result
      try {
        const notificationRepo = dataSource.getRepository(Notification);
        const notification = await notificationRepo.save({
          message: `Stock request for "${product.name}" was ${log.status.toLowerCase()}.`,
          type: "STOCK_UPDATE",
          product_id: product.id,
          quantity: Math.abs(log.added_stock),
        });
        io.emit("new-notification", notification);
      } catch (err) {
        console.error("Failed to save notification on stock approval/rejection:", err);
      }

      return res.json({
        success: true,
        message: `Stock request ${log.status.toLowerCase()} successfully`,
        data: log,
      });

    } catch (err: any) {
      await qr.rollbackTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      await qr.release();
    }
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

  // ==========================================
  // GET ALL NOTIFICATIONS
  // ==========================================
  async getNotifications(req: Request, res: Response) {
    const repo = dataSource.getRepository(Notification);
    const notifications = await repo.find({
      order: { id: "DESC" },
    });
    return res.json({
      success: true,
      data: notifications,
    });
  }

  // ==========================================
  // MARK NOTIFICATION AS READ
  // ==========================================
  async markRead(req: Request, res: Response) {
    const repo = dataSource.getRepository(Notification);
    const notificationId = Number(req.params.id);
    await repo.update(notificationId, { is_read: true });
    return res.json({
      success: true,
      message: "Notification marked as read",
    });
  }

  // ==========================================
  // MARK ALL AS READ
  // ==========================================
  async markAllRead(req: Request, res: Response) {
    const repo = dataSource.getRepository(Notification);
    await repo.update({ is_read: false }, { is_read: true });
    return res.json({
      success: true,
      message: "All notifications marked as read",
    });
  }
}