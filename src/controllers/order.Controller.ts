import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  Controller,
  Post,
  Get,
  Delete,
  Swagger,
  Middleware,
} from "../decorators";

import dataSource from "../config/database";

import {
  Order,
  OrderItem,
} from "../entities/order";

import {
  Coupon,
  CouponProduct,
} from "../entities/coupons";

import { Product } from "../entities/products";

import { StockLog } from "../entities/stock";

import validate from "../middleware/validate";
import { CreateOrderDto } from "../dto/order.dto";
import { Register } from "../entities/register";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { ProductStatus } from "../dto/products.dto";

// import { generateInvoicePDF } from "../utils/invoice";
import { generateQR } from "../utils/qr";
import { sendInvoiceEmail } from "../utils/email-invoice";
import { generateInvoicePDF} from "../utils/invoice";
// import { sendInvoiceEmail } from "../services/email.Service";
import fs from "fs";
import { getAvailableSuggestions, safelyGenerateAndLockInvoice } from "../utils/invoiceNumber";

@Controller("/orders")
export class OrderController {

  // ==========================================
  // DISCOUNT ENGINE
  // ==========================================
  private calculateDiscount(
    coupon: Coupon,
    items: any[],
    allowedIds: number[]
  ): number {

    let discount = 0;

    const eligibleItems = items.filter(item =>
      allowedIds.includes(item.product_id)
    );

    const eligibleSubtotal =
      eligibleItems.reduce(
        (sum, item) =>
          sum +
          Number(item.price) * Number(item.quantity),
        0
      );

    if (coupon.type === "percent") {
      discount =
        (eligibleSubtotal * Number(coupon.value)) / 100;
    }

    else if (coupon.type === "flat") {
      discount = Number(coupon.value);
    }

    else if (coupon.type === "bogo") {
      const x = Number(coupon.buy_x ?? 1);
      const y = Number(coupon.get_y ?? 1);

      for (const item of eligibleItems) {
        const sets = Math.floor(Number(item.quantity) / (x + y));
        discount += sets * y * Number(item.price);
      }
    }
    
    else if (coupon.type === "free_shipping") {
      // Free shipping discount logic, normally handled in shipping calculation
      discount = 0; 
    }

    return discount;
  }

  // ==========================================
  // GET SUGGESTIONS (REAL-TIME)
  // ==========================================
  @Get("/suggestions/:companyId")
  public async getSuggestions(req: Request, res: Response) {
    try {
      const companyId = Number(req.params.companyId);
      const suggestions = await getAvailableSuggestions(dataSource.manager, companyId);
      
      return res.json({ success: true, data: suggestions });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to load suggestions" });
    }
  }

  // ==========================================
  // CREATE ORDER (SAFE STOCK SYSTEM)
  // ==========================================
// ==========================================
  // CREATE ORDER (SAFE STOCK & SAFE INVOICE)
  // ==========================================
  @Post("/create")
  public async create(req: any, res: Response, next: NextFunction) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        company_id,
        items,
        coupon_code,
        payment,
        requested_invoice_no,
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Order items cannot be empty." });
      }

      const user_id = req.user?.userId || req.user?.id;

      const orderRepo = queryRunner.manager.getRepository(Order);
      const itemRepo = queryRunner.manager.getRepository(OrderItem);
      const productRepo = queryRunner.manager.getRepository(Product);
      const couponRepo = queryRunner.manager.getRepository(Coupon);
      const cpRepo = queryRunner.manager.getRepository(CouponProduct);
      const logRepo = queryRunner.manager.getRepository(StockLog);
      const userRepo = queryRunner.manager.getRepository(Register);

      // ================= GET & VALIDATE COMPANY =================
      const targetCompanyId = Number(company_id || req.user?.companyId || 1);
      let company = await userRepo.findOne({
        where: { id: targetCompanyId },
      });

      if (!company) {
        company = await userRepo.findOne({ select: { id: true, name: true, email: true } });
      }

      if (!company) {
        company = { id: targetCompanyId, name: "Default Store", email: "store@example.com" } as any;
      }

      // ================= FOREIGN KEY VALIDATION & FALLBACK =================
      let finalUserId = user_id;
      if (user_id) {
        const userExists = await userRepo.findOne({
          where: { id: user_id },
          select: { id: true },
        });
        if (!userExists) {
          finalUserId = undefined;
        }
      }

      if (!finalUserId) {
        const fallbackUser = await userRepo.findOne({
          where: { company_id: targetCompanyId },
          select: { id: true },
        }) || await userRepo.findOne({ select: { id: true } });

        if (fallbackUser) {
          finalUserId = fallbackUser.id;
        } else {
          return res.status(400).json({
            success: false,
            message: "No registered user found to assign order to.",
          });
        }
      }

      // ================= INVOICE GENERATION WITHIN TRANSACTION =================
      const safeInvoiceNo = await safelyGenerateAndLockInvoice(
        queryRunner.manager,
        targetCompanyId,
        requested_invoice_no
      );

      // ================= SUBTOTAL =================
      const subtotal = items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0
      );

      let discount = 0;
      let appliedCoupon: Coupon | null = null;

      if (coupon_code) {
        const coupon = await couponRepo.findOne({
          where: { code: coupon_code },
        });

        if (!coupon) {
          return res.status(400).json({ success: false, message: "Invalid coupon code" });
        }
        if (!coupon.is_active) {
          return res.status(400).json({ success: false, message: "Coupon is no longer active" });
        }
        if (coupon.start_date && new Date() < coupon.start_date) {
          return res.status(400).json({ success: false, message: "Coupon is not yet active" });
        }
        if (coupon.expiry_date && new Date() > coupon.expiry_date) {
          return res.status(400).json({ success: false, message: "Coupon has expired" });
        }
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
          return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
        }
        if (coupon.per_user_limit && coupon.per_user_limit > 0) {
          const userUsage = await orderRepo.count({
            where: { user_id: finalUserId, coupon_id: coupon.id }
          });
          if (userUsage >= coupon.per_user_limit) {
            return res.status(400).json({ success: false, message: "You have reached your usage limit for this coupon" });
          }
        }

        const mappings = await cpRepo.find({
          where: { coupon_id: coupon.id },
        });

        const allowedIds = mappings.map(m => m.product_id);
        discount = this.calculateDiscount(coupon, items, allowedIds);
        appliedCoupon = coupon;
      }

      const total = Math.max(0, subtotal - discount);

      // ================= CREATE ORDER =================
      const order = orderRepo.create({
        user_id: finalUserId,
        registration_id: finalUserId,
        company_id: targetCompanyId,
        status: "PENDING",
        invoice_no: safeInvoiceNo,
        subtotal,
        discount,
        total,
        payment_method: payment?.method || "CASH",
        payment_status: payment?.status || "PENDING",
        transaction_id: payment?.transaction_id || null,
        payment_gateway: payment?.gateway || null,
        coupon_id: appliedCoupon ? appliedCoupon.id : null,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
      });

      await orderRepo.save(order);

      if (appliedCoupon) {
        appliedCoupon.usage_count = (appliedCoupon.usage_count || 0) + 1;
        await couponRepo.save(appliedCoupon);
      }

      const stockUpdate: any[] = [];

      // ================= ITEMS + STOCK =================
      for (const item of items) {
        const product = await productRepo
          .createQueryBuilder("product")
          .setLock("pessimistic_write")
          .where("product.id = :id", { id: item.product_id })
          .getOne();

        if (!product) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: `Product #${item.product_id} not found` });
        }

        const currentStock = product.stock ?? product.stock_in_hand ?? 0;

        if (currentStock < item.quantity) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: `Insufficient stock for '${product.name}'. Available: ${currentStock}` });
        }

        const oldStock = currentStock;

        await itemRepo.save({
          order_id: order.id,
          product_id: product.id,
          price: item.price,
          quantity: item.quantity,
        });

        product.stock = currentStock - item.quantity;
        product.stock_in_hand = Math.max(0, (product.stock_in_hand ?? currentStock) - item.quantity);
        await productRepo.save(product);

        await logRepo.save({
          product_id: product.id,
          old_stock: oldStock,
          added_stock: -item.quantity,
          new_stock: product.stock,
          action: "ORDER_DEDUCT",
          created_by: finalUserId,
        });

        stockUpdate.push({
          product_id: product.id,
          product_name: product.name,
          old_stock: oldStock,
          new_stock: product.stock,
        });
      }

      // ================= QR LINK =================
      try {
        const qr = await generateQR(
          `${process.env.BASE_URL || 'http://localhost:3000'}/orders/verify/${order.id}`
        );
        order.qr_code = qr;
        await orderRepo.save(order);
      } catch (qrErr) {
        console.error("QR Code generation skipped:", qrErr);
      }

      await queryRunner.commitTransaction();

      // ================= LOAD FULL ORDER & POST-COMMIT SIDE EFFECTS =================
      let fullOrder: Order | null = null;
      try {
        fullOrder = await dataSource.getRepository(Order).findOne({
          where: { id: order.id },
          relations: {
            items: {
              product: true,
            },
          },
        });
      } catch (err) {
        fullOrder = order;
      }

      // PDF & Email side effects wrapped safely post-commit
      try {
        if (fullOrder) {
          const filePath = await generateInvoicePDF(fullOrder, company);
          if (company?.email) {
            await sendInvoiceEmail(company.email, filePath, safeInvoiceNo);
          }
        }
      } catch (postCommitErr) {
        console.error("Post-commit invoice PDF/Email generation failed non-critically:", postCommitErr);
      }

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: {
          order: fullOrder || order,
          breakdown: { subtotal, discount, total },
          stock_update: stockUpdate,
        },
      });

    } catch (error: any) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      return res.status(400).json({
        success: false,
        message: error?.message || "Order creation failed due to a server validation error.",
      });
    } finally {
      await queryRunner.release();
    }
  }
  // ==========================================
  // GET ALL ORDERS
  // ==========================================
  @Get("/")
  public async getAll(req: any, res: Response) {

    const repo = dataSource.getRepository(Order);

    const where = TenantService.scopeWhere(req.user);

    const orders = await repo.find({
      where,
      relations: {
        user: true,
        items: true,
      },
      order: { id: "DESC" },
    });

    return res.json({
      success: true,
      data: orders,
      order: true
    });
  }

  // ==========================================
  // GET BY ID
  // ==========================================
  @Get("/:id")
  public async getById(req: any, res: Response) {

    const repo = dataSource.getRepository(Order);

    const where = TenantService.scopeWhere(req.user, { id: Number(req.params.id) });

    const order = await repo.findOne({
      where,
      relations: {
        user: true,
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  }

  // ==========================================
  // DELETE ORDER (RESTORE STOCK)
  // ==========================================
  @Delete("/:id")
  public async delete(req: any, res: Response) {

    const repo = dataSource.getRepository(Order);
    const productRepo = dataSource.getRepository(Product);

    const where = TenantService.scopeWhere(req.user, { id: Number(req.params.id) });

    const order = await repo.findOne({
      where,
      relations: {items: true},
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // RESTORE STOCK
    for (const item of order.items) {

      const product = await productRepo.findOne({
        where: { id: item.product_id },
      });

      if (product) {
        product.stock += item.quantity;
        await productRepo.save(product);
      }
    }

    await repo.delete(order.id);

    return res.json({
      success: true,
      message: "Order deleted and stock restored",
    });
  }


@Get("/verify/:id")
@Swagger("Verify Invoice QR", "Scan QR → get order details")

async verify(req: Request, res: Response) {

  const repo = dataSource.getRepository(Order);

  const order = await repo.findOne({
    where: { id: Number(req.params.id) },
    relations: {
      items: true,
    },
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Invalid invoice",
    });
  }

  return res.json({
    success: true,
    data: order,
  });
}

// ==========================================
  // SECURE PDF GENERATION (USED FOR BOTH PRINT & DOWNLOAD)
  // ==========================================
  @Get("/invoice-pdf/:id")
  public async getInvoicePdf(req: Request, res: Response) {
    try {
      const order = await dataSource.getRepository(Order).findOne({
        where: { id: Number(req.params.id) },
        relations: { items: { product: true } }
      });

      if (!order) return res.status(404).json({ message: "Order not found" });

      const company = await dataSource.getRepository(Register).findOne({ where: { id: order.company_id }});
      
      // Generate the PDF file (returns path)
      const filePath = await generateInvoicePDF(order, company, req.query);

      // Stream binary data directly to client (Angular will read as Blob)
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': stat.size,
        'Content-Disposition': `inline; filename="${order.invoice_no}.pdf"` // Inline prevents auto-download by browser
      });
      
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

    } catch (error) {
      return res.status(500).json({ message: "Failed to generate PDF" });
    }
  }
  
}


