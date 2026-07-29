import { Request, Response } from "express";
import { Controller, Get, Post, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { PosOrderEntity } from "../entities/pos_order.entity";
import { Product } from "../entities/products";
import { ProductStatus } from "../dto";
import { StockLedger, StockMovementType } from "../entities/stock_ledger.entity";
import { UnitConverter } from "../utils/unit-converter";
import { emitStockChange, emitPOSSaleCompleted, emitDashboardUpdate } from "../socket/socket";

@Controller("/pos")
export class PosBillingController {

  /**
   * POST /api/pos/checkout
   * Process POS Checkout with multi-unit conversion, atomic stock deduction, and real-time socket events
   */
  @Post("/checkout")
  @Middleware([authenticateMiddleware])
  @Swagger("POS Checkout Order", "Process fast POS billing order with multi-unit conversions, stock ledger audit, and real-time socket sync")
  async createPosOrder(req: any, res: Response) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const {
        invoice_no,
        company_id,
        company_name,
        branch_id,
        branch_name,
        customer_name,
        customer_phone,
        items,
        subtotal,
        tax,
        discount,
        grand_total,
        payment_method,
        cash_tendered,
        change_due
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        await qr.rollbackTransaction();
        await qr.release();
        return res.status(400).json({ success: false, message: "Cart items array is required for POS checkout" });
      }

      const activeCompanyId = Number(company_id || req.user?.companyId || req.user?.company_id || 1);
      const activeBranchId = Number(branch_id || req.user?.branchId || req.user?.branch_id || 1);
      const invoiceNo = invoice_no || `INV-POS-${Date.now().toString().slice(-6)}`;
      const userId = req.user?.userId || req.user?.id || null;

      const posOrderRepo = qr.manager.getRepository(PosOrderEntity);
      const productRepo = qr.manager.getRepository(Product);
      const stockLedgerRepo = qr.manager.getRepository(StockLedger);

      // Create new POS Order
      const newPosOrder = posOrderRepo.create({
        invoice_no: invoiceNo,
        company_id: activeCompanyId,
        branch_id: activeBranchId,
        company_name: company_name || "Spike Retail HQ",
        branch_name: branch_name || "Downtown Main Outlet",
        customer_name: customer_name || "Walk-in Customer",
        customer_phone: customer_phone || "N/A",
        subtotal: Number(subtotal || 0),
        tax: Number(tax || 0),
        discount: Number(discount || 0),
        grand_total: Number(grand_total || 0),
        payment_method: payment_method || "CASH",
        payment_status: "COMPLETED",
        cash_tendered: cash_tendered ? Number(cash_tendered) : null,
        change_due: change_due ? Number(change_due) : null,
        items: items
      });

      await posOrderRepo.save(newPosOrder);

      const stockChanges: any[] = [];

      // Process stock deduction with unit conversion & pessimistic lock
      for (const item of items) {
        if (item.product_id) {
          const prod = await productRepo.createQueryBuilder("product")
            .setLock("pessimistic_write")
            .where("product.id = :id", { id: item.product_id })
            .getOne();

          if (prod) {
            const unitName = item.unit_name || item.unit || prod.base_unit || "Piece";
            const itemQty = Number(item.quantity || 1);
            const customRatio = item.conversion_ratio ? Number(item.conversion_ratio) : undefined;

            // Convert sold unit quantity to Base Unit quantity
            const baseDeductionQty = UnitConverter.toBaseQuantity(itemQty, unitName, customRatio);
            const currentStockBase = Number(prod.stock_in_hand ?? prod.stock ?? 0);
            
            // Prevent negative stock check
            if (currentStockBase < baseDeductionQty) {
              await qr.rollbackTransaction();
              await qr.release();
              return res.status(400).json({
                success: false,
                message: `Insufficient stock for product '${prod.name}'. Current stock: ${currentStockBase} ${prod.base_unit}, required: ${baseDeductionQty} ${prod.base_unit}.`
              });
            }

            const newStockBase = Math.max(0, currentStockBase - baseDeductionQty);
            prod.stock_in_hand = newStockBase;
            prod.stock = newStockBase;
            await productRepo.save(prod);

            // Audit in Stock Ledger
            const ledgerEntry = stockLedgerRepo.create({
              product_id: prod.id,
              branch_id: activeBranchId,
              movement_type: StockMovementType.POS_SALE,
              unit_name: unitName,
              quantity_change: -itemQty,
              quantity_change_base: -baseDeductionQty,
              balance_after_base: newStockBase,
              reference_id: invoiceNo,
              notes: `POS Checkout Invoice #${invoiceNo} (${itemQty} ${unitName})`,
              created_by_user_id: userId
            });
            await stockLedgerRepo.save(ledgerEntry);

            stockChanges.push({
              product_id: prod.id,
              product_name: prod.name,
              base_unit: prod.base_unit,
              old_stock: currentStockBase,
              new_stock: newStockBase,
              sold_qty: itemQty,
              sold_unit: unitName
            });
          }
        }
      }

      await qr.commitTransaction();
      await qr.release();

      // Emit real-time Socket.IO broadcasts
      try {
        emitPOSSaleCompleted(activeBranchId, {
          invoice_no: invoiceNo,
          grand_total: newPosOrder.grand_total,
          items_count: items.length,
          order: newPosOrder
        });

        for (const change of stockChanges) {
          emitStockChange(activeBranchId, change);
        }

        emitDashboardUpdate(activeCompanyId, {
          recent_sale: invoiceNo,
          total_amount: newPosOrder.grand_total,
          branch_id: activeBranchId
        });
      } catch (socketErr) {
        console.error("[POS Socket Sync Error]:", socketErr);
      }

      return res.status(201).json({
        success: true,
        message: "POS Order processed, stock deducted, and real-time sync completed",
        data: newPosOrder
      });

    } catch (err: any) {
      await qr.rollbackTransaction();
      await qr.release();
      console.error("[PosBillingController] createPosOrder error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to process POS checkout" });
    }
  }

  /**
   * GET /api/pos/orders
   * Get historical POS orders for company/branch
   */
  @Get("/orders")
  @Middleware([authenticateMiddleware])
  @Swagger("Get POS Orders", "Fetch historical POS billing invoices for active company and branch")
  async getPosOrders(req: any, res: Response) {
    try {
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = req.query.branch_id ? Number(req.query.branch_id) : undefined;

      const posOrderRepo = dataSource.getRepository(PosOrderEntity);
      const queryBuilder = posOrderRepo.createQueryBuilder("order")
        .where("order.company_id = :companyId", { companyId })
        .orderBy("order.created_at", "DESC");

      if (branchId) {
        queryBuilder.andWhere("order.branch_id = :branchId", { branchId });
      }

      const orders = await queryBuilder.getMany();

      return res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (err: any) {
      console.error("[PosBillingController] getPosOrders error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch POS orders" });
    }
  }

  /**
   * GET /api/pos/products
   * Fetch active product catalog for POS
   */
  @Get("/products")
  @Middleware([authenticateMiddleware])
  @Swagger("Get POS Products", "Fetch active product catalog for POS grid display and barcode scanning")
  async getPosProducts(req: any, res: Response) {
    try {
      const productRepo = dataSource.getRepository(Product);
      const products = await productRepo.find({
        where: { is_deleted: false, status: ProductStatus.ACTIVE },
        order: { id: "DESC" }
      });

      return res.status(200).json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (err: any) {
      console.error("[PosBillingController] getPosProducts error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch POS products" });
    }
  }

  /**
   * GET /api/pos/analytics
   * Get financial analytics summary for POS branch
   */
  @Get("/analytics")
  @Middleware([authenticateMiddleware])
  @Swagger("Get POS Analytics", "Fetch branch revenue, order count, and average ticket size for POS dashboard")
  async getPosAnalytics(req: any, res: Response) {
    try {
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = req.query.branch_id ? Number(req.query.branch_id) : undefined;

      const posOrderRepo = dataSource.getRepository(PosOrderEntity);
      const qb = posOrderRepo.createQueryBuilder("order")
        .where("order.company_id = :companyId", { companyId });

      if (branchId) {
        qb.andWhere("order.branch_id = :branchId", { branchId });
      }

      const orders = await qb.getMany();
      const totalRevenue = orders.reduce((acc, o) => acc + Number(o.grand_total || 0), 0);
      const totalTax = orders.reduce((acc, o) => acc + Number(o.tax || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

      return res.status(200).json({
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_tax: totalTax,
          total_orders: totalOrders,
          avg_order_value: avgOrderValue
        }
      });
    } catch (err: any) {
      console.error("[PosBillingController] getPosAnalytics error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch POS analytics" });
    }
  }
}
