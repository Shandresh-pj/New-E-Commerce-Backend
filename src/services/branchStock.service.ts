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
    const numCompanyId = Number(company_id || 1);
    const numProductId = Number(product_id);
    const numQty = Number(quantity || 0);

    let stock = await repo.findOne({
      where: { company_id: numCompanyId, branch_name, product_id: numProductId },
    });

    if (!stock) {
      stock = repo.create({
        company_id: numCompanyId,
        branch_name,
        product_id: numProductId,
        stock: 0,
      });
    }

    const oldStock = Number(stock.stock || 0);

    if (action === "ADD") {
      stock.stock = oldStock + numQty;
    } else if (action === "SET") {
      stock.stock = numQty;
    } else {
      // REMOVE / DEDUCT
      if (oldStock < numQty) {
        throw new Error(`Insufficient branch stock in "${branch_name}". Available: ${oldStock}, Requested removal: ${numQty}`);
      }
      stock.stock = oldStock - numQty;
    }

    await repo.save(stock);

    const newStock = stock.stock;

    // ================= REAL TIME COMPANY DASHBOARD =================
    io.to(`company_${numCompanyId}`).emit("branch-stock-update", {
      company_id: numCompanyId,
      branch_name,
      product_id: numProductId,
      oldStock,
      newStock,
      action,
    });

    // ================= BRANCH PANEL =================
    io.to(`branch_${branch_name}`).emit("branch-stock-update", {
      branch_name,
      product_id: numProductId,
      oldStock,
      newStock,
    });

    // ================= LOW STOCK ALERT =================
    if (newStock <= 5) {
      io.to(`company_${numCompanyId}`).emit("low-stock-alert", {
        company_id: numCompanyId,
        branch_name,
        product_id: numProductId,
        stock: newStock,
      });
    }

    return stock;
  }
}