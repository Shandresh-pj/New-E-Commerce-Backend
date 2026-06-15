import { EntityManager } from "typeorm";
import { io } from "../socket/socket";
import { BranchStock } from "../entities/branch_stock";

export class BranchStockService {

  static async updateStock({
    manager,
    company_id,
    branch_name,
    product_id,
    quantity,
    action,
    user_id,
  }: any) {

    const repo = manager.getRepository(BranchStock);

    let stock = await repo.findOne({
      where: { company_id, branch_name, product_id },
    });

    if (!stock) {
      stock = repo.create({
        company_id,
        branch_name,
        product_id,
        stock: 0,
      });
    }

    const oldStock = stock.stock;

    if (action === "ADD") {
      stock.stock += quantity;
    } else {
      if (stock.stock < quantity) {
        throw new Error("Insufficient branch stock");
      }
      stock.stock -= quantity;
    }

    await repo.save(stock);

    const newStock = stock.stock;

    // ================= REAL TIME COMPANY DASHBOARD =================
    io.to(`company_${company_id}`).emit("branch-stock-update", {
      company_id,
      branch_name,
      product_id,
      oldStock,
      newStock,
      action,
    });

    // ================= BRANCH PANEL =================
    io.to(`branch_${branch_name}`).emit("branch-stock-update", {
      branch_name,
      product_id,
      oldStock,
      newStock,
    });

    // ================= LOW STOCK ALERT =================
    if (newStock <= 5) {
      io.to(`company_${company_id}`).emit("low-stock-alert", {
        company_id,
        branch_name,
        product_id,
        stock: newStock,
      });
    }

    return stock;
  }
}