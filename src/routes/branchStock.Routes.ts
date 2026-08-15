import { Router } from "express";
import dataSource from "../config/database";
import { BranchStock } from "../entities/branch_stock";
import { Product } from "../entities/products";
import { Branch } from "../entities/branch";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: BranchStock
 *   description: Branch outlet inventory and stock transfer operations
 */

/**
 * @swagger
 * /branch-stock:
 *   get:
 *     summary: Branch Stock Inventory Overview
 *     description: Retrieve branch stock inventory records across outlets.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Branch stock list
 */
router.get("/branch-stock", authenticateMiddleware, async (req: any, res) => {
  try {
    const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
    const branchStockRepo = dataSource.getRepository(BranchStock);
    const productRepo = dataSource.getRepository(Product);

    const where: any = { company_id: companyId };
    if (req.query.branch_id) {
      where.branch_id = Number(req.query.branch_id);
    }

    const branchStocks = await branchStockRepo.find({
      where,
      relations: { product: true },
      order: { id: "DESC" },
    });

    if (branchStocks.length === 0) {
      // Fallback: populate default view from main products catalog
      const products = await productRepo.find({
        where: { registration_id: companyId },
        take: 50,
      });

      const fallbackData = products.map((p) => ({
        id: p.id,
        branch_id: 1,
        branch_name: "Downtown Main Outlet",
        product_id: p.id,
        product_name: p.name,
        sku: p.barcode || `SKU-${p.id}`,
        stock: Number(p.stock ?? p.stock_in_hand ?? 0),
        reorder_level: 10,
        status: p.status || "ACTIVE",
      }));

      return res.json({ success: true, data: fallbackData });
    }

    const formatted = branchStocks.map((bs) => ({
      id: bs.id,
      branch_name: bs.branch_name,
      product_id: bs.product_id,
      product_name: bs.product ? bs.product.name : `Product #${bs.product_id}`,
      sku: bs.product?.barcode || `SKU-${bs.product_id}`,
      stock: bs.stock,
      created_at: bs.created_at,
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    console.error("[BranchStock Error]:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch branch stock" });
  }
});

/**
 * @swagger
 * /branch-stock/update:
 *   post:
 *     summary: Update Branch Stock Quantity
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - stock
 *             properties:
 *               branch_name:
 *                 type: string
 *               product_id:
 *                 type: integer
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Branch stock updated
 */
router.post("/branch-stock/update", authenticateMiddleware, async (req: any, res) => {
  try {
    const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
    const { branch_name, product_id, stock } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }

    const branchStockRepo = dataSource.getRepository(BranchStock);
    let record = await branchStockRepo.findOne({
      where: {
        company_id: companyId,
        product_id: Number(product_id),
        branch_name: branch_name || "Downtown Main Outlet",
      },
    });

    if (record) {
      record.stock = Number(stock);
      await branchStockRepo.save(record);
    } else {
      record = branchStockRepo.create({
        company_id: companyId,
        branch_name: branch_name || "Downtown Main Outlet",
        product_id: Number(product_id),
        stock: Number(stock || 0),
      });
      await branchStockRepo.save(record);
    }

    return res.json({ success: true, message: "Branch stock updated", data: record });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || "Failed to update branch stock" });
  }
});

export default router;
