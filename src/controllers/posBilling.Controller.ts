import { Request, Response } from "express";
import { Controller, Get, Post, Middleware, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import dataSource from "../config/database";
import { PosOrderEntity } from "../entities/pos_order.entity";
import { Product } from "../entities/products";
import { Branch } from "../entities/branch";

@Controller("/pos")
export class PosBillingController {

  /**
   * POST /api/pos/checkout
   * Process POS Checkout & Generate Invoice Order
   */
  @Post("/checkout")
  @Middleware([authenticateMiddleware])
  @Swagger("POS Checkout Order", "Process fast POS billing order with invoice generation, GST tax, and stock deduction")
  async createPosOrder(req: any, res: Response) {
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
        return res.status(400).json({ success: false, message: "Cart items array is required for POS checkout" });
      }

      const activeCompanyId = company_id || req.user?.companyId || req.user?.company_id || 1;
      const activeBranchId = branch_id || req.user?.branchId || req.user?.branch_id || 1;
      const invoiceNo = invoice_no || `INV-POS-${Date.now().toString().slice(-6)}`;

      const posOrderRepo = dataSource.getRepository(PosOrderEntity);
      const productRepo = dataSource.getRepository(Product);

      // Create new POS Order
      const newPosOrder = posOrderRepo.create({
        invoice_no: invoiceNo,
        company_id: Number(activeCompanyId),
        branch_id: Number(activeBranchId),
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

      // Deduct inventory stock for purchased products
      for (const item of items) {
        if (item.product_id) {
          const prod = await productRepo.findOne({ where: { id: item.product_id } });
          if (prod) {
            const currentStock = prod.stock_in_hand || 50;
            const purchasedQty = Number(item.quantity || 1);
            prod.stock_in_hand = Math.max(0, currentStock - purchasedQty);
            await productRepo.save(prod);
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: "POS Order created & inventory stock updated successfully",
        data: newPosOrder
      });
    } catch (err: any) {
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
      const companyId = req.user?.companyId || req.user?.company_id || 1;
      const branchId = req.query?.branch_id || req.user?.branchId || 1;

      const posOrderRepo = dataSource.getRepository(PosOrderEntity);
      const orders = await posOrderRepo.find({
        where: { company_id: Number(companyId), branch_id: Number(branchId) },
        order: { created_at: "DESC" },
        take: 50
      });

      return res.json({
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
   * Fetch Active POS products for barcode scanner & grid catalog
   */
  @Get("/products")
  @Middleware([authenticateMiddleware])
  @Swagger("Get POS Products", "Fetch active inventory products for POS billing terminal")
  async getPosProducts(req: any, res: Response) {
    try {
      const productRepo = dataSource.getRepository(Product);
      const products = await productRepo.find({
        order: { id: "ASC" },
        take: 100
      });

      const mappedProducts = products.map(p => ({
        id: p.id,
        code: p.barcode || `8901030${p.id}`,
        name: p.name,
        category: p.category || "General Products",
        price: Number(p.price || 100),
        stock: Number(p.stock_in_hand || p.stock || 50),
        unit: "pcs",
        isWeighable: false,
        image: p.image || "assets/images/products/p1.jpg"
      }));

      return res.json({
        success: true,
        count: mappedProducts.length,
        data: mappedProducts
      });
    } catch (err: any) {
      console.error("[PosBillingController] getPosProducts error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch POS products" });
    }
  }

  /**
   * GET /api/pos/analytics
   * Get Branch POS Financial Profit & Loss Analytics
   */
  @Get("/analytics")
  @Middleware([authenticateMiddleware])
  @Swagger("Get POS Analytics", "POS Revenue, Tax, Margin & Sales breakdown")
  async getPosAnalytics(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.user?.company_id || 1;
      const branchId = req.query?.branch_id;

      const posOrderRepo = dataSource.getRepository(PosOrderEntity);
      const query = posOrderRepo.createQueryBuilder("order")
        .where("order.company_id = :companyId", { companyId: Number(companyId) });

      if (branchId) {
        query.andWhere("order.branch_id = :branchId", { branchId: Number(branchId) });
      }

      const orders = await query.getMany();

      const totalRevenue = orders.reduce((acc, o) => acc + Number(o.grand_total || 0), 0);
      const totalTax = orders.reduce((acc, o) => acc + Number(o.tax || 0), 0);
      const totalOrders = orders.length;

      return res.json({
        success: true,
        summary: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          averageOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0
        }
      });
    } catch (err: any) {
      console.error("[PosBillingController] getPosAnalytics error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch POS analytics" });
    }
  }
}
