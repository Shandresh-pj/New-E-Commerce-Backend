import { EntityManager } from "typeorm";
import { Product } from "../entities/products";
import { StockLog } from "../entities/stock";
import { io } from "../socket/socket";
import { LowStockAlert } from "../entities/lowstock";
import { Notification } from "../entities/notification";

export class StockService {

  static async updateStock(
    product_id: number,
    quantity: number,
    action: "ADD" | "REMOVE",
    user_id: number,
    manager: EntityManager,
    isApproved: boolean = false
  ) {

    const productRepo = manager.getRepository(Product);
    const logRepo = manager.getRepository(StockLog);

    const product = await productRepo.findOne({
      where: { id: product_id },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const oldStock = product.stock;
    let newStock = oldStock;

    if (isApproved) {
      if (action === "ADD") {
        product.stock += quantity;
      } else {
        if (product.stock < quantity) {
          throw new Error("Insufficient stock");
        }
        product.stock -= quantity;
      }
      await productRepo.save(product);
      newStock = product.stock;
    }

    const log = await logRepo.save({
      product_id: product.id,
      old_stock: oldStock,
      added_stock: action === "ADD" ? quantity : -quantity,
      new_stock: newStock,
      action,
      created_by: user_id,
      status: isApproved ? "Approved" : "Pending Approval"
    });

    // Broadcast live event for request
    io.emit("stock-update", {
      log_id: log.id,
      product_id: product.id,
      product_name: product.name,
      old_stock: oldStock,
      new_stock: newStock,
      added_stock: action === "ADD" ? quantity : -quantity,
      action,
      status: log.status
    });

    // Trigger low stock checks only if approved and changed
    if (isApproved) {
      const threshold = product.low_stock_threshold || 5;
      const criticalThreshold = product.critical_stock_threshold || 2;

      let type: string | null = null;
      if (newStock <= 0) {
        type = "OUT_OF_STOCK";
      } else if (newStock <= criticalThreshold) {
        type = "CRITICAL_STOCK";
      } else if (newStock <= threshold) {
        type = "LOW_STOCK";
      }

      if (type) {
        try {
          const alertRepo = manager.getRepository(LowStockAlert);
          await alertRepo.save({
            product_id: product.id,
            product_name: product.name,
            current_stock: newStock,
            threshold,
          });

          // Also save in notification entity
          const notificationRepo = manager.getRepository(Notification);
          const notification = await notificationRepo.save({
            message: `Product "${product.name}" has reached ${type.replace('_', ' ')}: current stock ${newStock}`,
            type,
            product_id: product.id,
            quantity: newStock,
          });

          io.emit("low-stock-alert", {
            product_id: product.id,
            product_name: product.name,
            stock: newStock,
            threshold,
            type,
          });

          io.emit("new-notification", notification);
        } catch (alertErr) {
          console.error("Alert save error:", alertErr);
        }
      }
    } else {
      // If it is pending approval, emit a notification for approval request
      try {
        const notificationRepo = manager.getRepository(Notification);
        const notification = await notificationRepo.save({
          message: `Stock update request for "${product.name}" (Qty: ${quantity}, Action: ${action}) requires approval.`,
          type: "APPROVAL_REQUEST",
          product_id: product.id,
          quantity,
        });
        io.emit("new-notification", notification);
      } catch (err) {
        console.error("Failed to save approval request notification:", err);
      }
    }

    return { product, log };
  }
}