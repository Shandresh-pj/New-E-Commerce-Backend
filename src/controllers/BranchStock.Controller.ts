import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import { Request, Response, NextFunction } from "express";
import dataSource from "../config/database";
import { UpdateBranchStockDto } from "../dto/branchStock.dto";
import validate from "../middleware/validate";
import { BranchStockService } from "../services/branchStock.service";
import { BranchStock } from "../entities/branch_stock";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { BranchTransfer } from "../entities/branchTransfer";
import { UserType } from "../utils/Role-Access";
import { Notification } from "../entities/notification";
import { io } from "../socket/socket";
import { Product } from "../entities/products";

@Controller("/branch-stock")
export class BranchStockController {

  @Post("/update")
  @Middleware([validate(UpdateBranchStockDto)])
  @Swagger("Update Branch Stock", "Add or Remove stock per branch")
  async update(req: any, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const companyId = Number(req.body.company_id || req.user?.companyId || req.user?.company_id || 1);
      const userId = req.user?.userId || req.user?.id || 1;

      const result = await BranchStockService.updateStock({
        manager: qr.manager,
        ...req.body,
        company_id: companyId,
        user_id: userId,
      });

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Branch stock updated successfully",
        data: result,
      });
    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  @Get("/")
  @Swagger("Get Branch Stocks", "List all branch stock data")
  async getAll(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(BranchStock);
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const where: any = { ...TenantService.scopeWhere(req.user) };

      if (req.query.branch_id) {
        where.branch_id = Number(req.query.branch_id);
      }
      if (req.query.branch_name) {
        where.branch_name = String(req.query.branch_name);
      }

      const branchStocks = await repo.find({
        where,
        relations: { product: true },
        order: { id: "DESC" },
      });

      if (branchStocks.length === 0) {
        // Fallback: populate default view from main products catalog if no branch stocks registered yet
        const productRepo = dataSource.getRepository(Product);
        const products = await productRepo.find({
          where: { registration_id: companyId },
          take: 50,
        });

        const fallbackData = products.map((p) => ({
          id: p.id,
          company_id: companyId,
          branch_name: "Main Branch",
          product_id: p.id,
          product: p,
          stock: Number(p.stock ?? p.stock_in_hand ?? 0),
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));

        return res.json({
          success: true,
          data: fallbackData,
        });
      }

      return res.json({
        success: true,
        data: branchStocks,
      });
    } catch (err: any) {
      console.error("[getBranchStocks Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch branch stocks" });
    }
  }

  // ================= TRANSFER STOCK REQUEST =================
  async requestTransfer(req: any, res: Response, next: NextFunction) {
    try {
      const { from_branch, to_branch, product_id, quantity } = req.body;
      const user = req.user;
      const userId = user?.userId || user?.id || 1;
      const companyId = Number(user?.companyId || user?.company_id || 1);

      if (!from_branch || !to_branch || !product_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: "from_branch, to_branch, product_id, and quantity are required",
        });
      }

      if (from_branch === to_branch) {
        return res.status(400).json({
          success: false,
          message: "Source and destination branch cannot be the same",
        });
      }

      // Verify the product exists
      const productRepo = dataSource.getRepository(Product);
      const product = await productRepo.findOneBy({ id: Number(product_id) });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // Check if from_branch actually has enough stock
      const branchStockRepo = dataSource.getRepository(BranchStock);
      const fromStock = await branchStockRepo.findOne({
        where: { branch_name: from_branch, product_id: Number(product_id) },
      });

      if (!fromStock || fromStock.stock < Number(quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source branch "${from_branch}". Current stock: ${fromStock?.stock || 0}`,
        });
      }

      const transferRepo = dataSource.getRepository(BranchTransfer);
      const transfer = transferRepo.create({
        from_branch,
        to_branch,
        product_id: Number(product_id),
        quantity: Number(quantity),
        status: "Pending Approval",
        created_by: userId,
      });

      await transferRepo.save(transfer);

      const companyRoom = `company_${companyId}`;

      // Create notification for Admins
      try {
        const notificationRepo = dataSource.getRepository(Notification);
        const notification = await notificationRepo.save({
          message: `Branch stock transfer request: ${from_branch} -> ${to_branch} for "${product.name}" (Qty: ${quantity}) requires approval.`,
          type: "APPROVAL_REQUEST",
          product_id: Number(product_id),
          branch_name: from_branch,
          quantity: Number(quantity),
        });

        io.to(companyRoom).emit("new-notification", notification);
      } catch (nErr) {
        console.error("Failed to save transfer notification:", nErr);
      }

      // Emit transfer update event
      io.to(companyRoom).emit("branch-transfer-update", {
        transfer_id: transfer.id,
        from_branch,
        to_branch,
        product_id: Number(product_id),
        quantity: Number(quantity),
        status: transfer.status,
      });

      return res.json({
        success: true,
        message: "Branch stock transfer request submitted for approval",
        data: transfer,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= GET ALL TRANSFERS =================
  async getTransfers(req: any, res: Response, next: NextFunction) {
    try {
      const transferRepo = dataSource.getRepository(BranchTransfer);
      const transfers = await transferRepo.find({
        relations: { product: true },
        order: { id: "DESC" },
      });

      return res.json({
        success: true,
        data: transfers,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= APPROVE BRANCH TRANSFER =================
  async approveTransfer(req: any, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const transferId = Number(req.params.id);
      const { action, rejection_reason } = req.body; // action: 'APPROVE' | 'REJECT'

      if (!transferId || isNaN(transferId)) {
        return res.status(400).json({ success: false, message: "Invalid transfer ID" });
      }

      const transferRepo = qr.manager.getRepository(BranchTransfer);
      const transfer = await transferRepo.findOne({
        where: { id: transferId },
        relations: { product: true },
      });

      if (!transfer) {
        return res.status(404).json({ success: false, message: "Branch transfer record not found" });
      }

      if (transfer.status !== "Pending Approval") {
        return res.status(400).json({ success: false, message: "This branch transfer is not pending approval" });
      }

      const user = req.user;
      const userId = user?.userId || user?.id || 1;

      const branchStockRepo = qr.manager.getRepository(BranchStock);
      const refStock = await branchStockRepo.findOne({
        where: { branch_name: transfer.from_branch, product_id: transfer.product_id },
      });
      const companyId = refStock?.company_id || Number(user?.companyId || user?.company_id || 1);

      if (action === "APPROVE") {
        // Deduct from source branch
        let fromStock = refStock;

        if (!fromStock || fromStock.stock < transfer.quantity) {
          throw new Error(`Insufficient stock in source branch "${transfer.from_branch}". Current stock: ${fromStock?.stock || 0}`);
        }

        const oldFromStock = fromStock.stock;
        fromStock.stock -= transfer.quantity;
        await branchStockRepo.save(fromStock);

        // Add to destination branch
        let toStock = await branchStockRepo.findOne({
          where: { branch_name: transfer.to_branch, product_id: transfer.product_id },
        });

        if (!toStock) {
          toStock = branchStockRepo.create({
            company_id: companyId,
            branch_name: transfer.to_branch,
            product_id: transfer.product_id,
            stock: 0,
          });
        }

        const oldToStock = toStock.stock;
        toStock.stock += transfer.quantity;
        await branchStockRepo.save(toStock);

        transfer.status = "Approved";
        transfer.approved_by = userId;
        transfer.approved_at = new Date();

        // Emit real-time updates for both branches
        io.to(`company_${companyId}`).emit("branch-stock-update", {
          company_id: companyId,
          branch_name: transfer.from_branch,
          product_id: transfer.product_id,
          oldStock: oldFromStock,
          newStock: fromStock.stock,
          action: "REMOVE",
        });

        io.to(`company_${companyId}`).emit("branch-stock-update", {
          company_id: companyId,
          branch_name: transfer.to_branch,
          product_id: transfer.product_id,
          oldStock: oldToStock,
          newStock: toStock.stock,
          action: "ADD",
        });

        // Trigger low stock checks on source branch
        const threshold = 5;
        if (fromStock.stock <= threshold) {
          io.to(`company_${companyId}`).emit("low-stock-alert", {
            company_id: companyId,
            branch_name: transfer.from_branch,
            product_id: transfer.product_id,
            stock: fromStock.stock,
            type: "LOW_STOCK",
          });

          try {
            const notificationRepo = qr.manager.getRepository(Notification);
            const notification = await notificationRepo.save({
              message: `Branch "${transfer.from_branch}" has reached LOW STOCK level for "${transfer.product?.name}": current stock ${fromStock.stock}`,
              type: "LOW_STOCK",
              product_id: transfer.product_id,
              branch_name: transfer.from_branch,
              quantity: fromStock.stock,
            });
            io.to(`company_${companyId}`).emit("new-notification", notification);
          } catch (e) {
            console.error("Failed to save branch low stock alert notification:", e);
          }
        }
      } else if (action === "REJECT") {
        transfer.status = "Rejected";
        transfer.rejection_reason = rejection_reason || "No reason provided";
      } else {
        return res.status(400).json({ success: false, message: "Invalid transfer action. Must be APPROVE or REJECT" });
      }

      await transferRepo.save(transfer);
      await qr.commitTransaction();

      const emitScoped = (event: string, payload: any) => {
        if (companyId) io.to(`company_${companyId}`).emit(event, payload);
        else io.emit(event, payload);
      };

      // Emit transfer update event
      emitScoped("branch-transfer-update", {
        transfer_id: transfer.id,
        from_branch: transfer.from_branch,
        to_branch: transfer.to_branch,
        product_id: transfer.product_id,
        quantity: transfer.quantity,
        status: transfer.status,
      });

      // Emit notifications
      try {
        const notificationRepo = dataSource.getRepository(Notification);
        const notification = await notificationRepo.save({
          message: `Stock transfer request from ${transfer.from_branch} to ${transfer.to_branch} was ${transfer.status.toLowerCase()}.`,
          type: "STOCK_UPDATE",
          product_id: transfer.product_id,
          quantity: transfer.quantity,
        });
        emitScoped("new-notification", notification);
      } catch (nErr) {
        console.error("Failed to save transfer approval notification:", nErr);
      }

      return res.json({
        success: true,
        message: `Branch stock transfer ${transfer.status.toLowerCase()} successfully`,
        data: transfer,
      });
    } catch (err: any) {
      await qr.rollbackTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally {
      await qr.release();
    }
  }
}