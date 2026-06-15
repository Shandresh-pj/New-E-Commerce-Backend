import { EntityManager } from "typeorm";
import { Product } from "../entities/products";
import { StockLog } from "../entities/stock";
import { io } from "../socket/socket";
import { LowStockAlert } from "../entities/lowstock";

export class StockService {

  static async updateStock(
    product_id: number,
    quantity: number,
    action: "ADD" | "REMOVE",
    user_id: number,
    manager: EntityManager
  ) {

    const productRepo = manager.getRepository(Product);
    const logRepo = manager.getRepository(StockLog);
    const alertRepo = manager.getRepository(LowStockAlert);

    const product = await productRepo.findOne({
      where: { id: product_id },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const oldStock = product.stock;

    // ================= STOCK UPDATE =================
    if (action === "ADD") {
      product.stock += quantity;
    } else {
      if (product.stock < quantity) {
        throw new Error("Insufficient stock");
      }
      product.stock -= quantity;
    }

    await productRepo.save(product);

    const newStock = product.stock;

    // ================= STOCK LOG =================
    await logRepo.save({
      product_id: product.id,
      old_stock: oldStock,
      added_stock: action === "ADD" ? quantity : -quantity,
      new_stock: newStock,
      action,
      created_by: user_id,
    });

    // ================= REALTIME SOCKET =================
    io.emit("stock-update", {
      product_id: product.id,
      product_name: product.name,
      old_stock: oldStock,
      new_stock: newStock,
      action,
    });

    // ================= LOW STOCK ALERT =================
    const threshold = 5;

    if (newStock <= threshold) {

      const alert = await alertRepo.save({
        product_id: product.id,
        product_name: product.name,
        current_stock: newStock,
        threshold,
      });

      io.emit("low-stock-alert", {
        product_id: product.id,
        product_name: product.name,
        stock: newStock,
        threshold,
      });

      return { product, alert };
    }

    return { product };
  }
}