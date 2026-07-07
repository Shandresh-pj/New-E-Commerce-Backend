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

import { dataSource } from "../server";

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


import { generateInvoiceNumber } from "../utils/invoiceNumber";
import { generateInvoicePDF } from "../utils/invoice";
import { generateQR } from "../utils/qr";
import { sendInvoiceEmail } from "../utils/email-invoice";
// import { sendInvoiceEmail } from "../services/email.Service";

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
      for (const item of eligibleItems) {
        const freeQty = Math.floor(Number(item.quantity) / 2);
        discount += freeQty * Number(item.price);
      }
    }

    else if (coupon.type === "buy_x_get_y") {

      const x = Number((coupon as any).buy_x ?? 2);
      const y = Number((coupon as any).get_y ?? 1);

      for (const item of eligibleItems) {
        const sets = Math.floor(Number(item.quantity) / (x + y));
        discount += sets * y * Number(item.price);
      }
    }

    return discount;
  }

  // ==========================================
  // CREATE ORDER (SAFE STOCK SYSTEM)
  // ==========================================
@Post("/create")
@Middleware([validate(CreateOrderDto)])
@Swagger("Create Order", "Enterprise safe order creation")

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
    } = req.body;

    const user_id = req.user.userId;

    const orderRepo = queryRunner.manager.getRepository(Order);
    const itemRepo = queryRunner.manager.getRepository(OrderItem);
    const productRepo = queryRunner.manager.getRepository(Product);
    const couponRepo = queryRunner.manager.getRepository(Coupon);
    const cpRepo = queryRunner.manager.getRepository(CouponProduct);
    const logRepo = queryRunner.manager.getRepository(StockLog);
    const userRepo = queryRunner.manager.getRepository(Register);

    // ================= GET COMPANY =================
    const company = await userRepo.findOne({
      where: { id: company_id },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    // ================= INVOICE FIRST =================
    const invoice_no = await generateInvoiceNumber(company_id);

    // ================= SUBTOTAL =================
    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    let discount = 0;

    if (coupon_code) {
      const coupon = await couponRepo.findOne({
        where: { code: coupon_code, is_active: true },
      });

      if (coupon) {
        const mappings = await cpRepo.find({
          where: { coupon_id: coupon.id },
        });

        const allowedIds = mappings.map(m => m.product_id);

        discount = this.calculateDiscount(coupon, items, allowedIds);
      }
    }

    const total = Math.max(0, subtotal - discount);

    // ================= CREATE ORDER =================
    const order = orderRepo.create({
      user_id,
      company_id,
      invoice_no, // ✅ FIXED HERE
      subtotal,
      discount,
      total,
      payment_method: payment?.method,
      payment_status: payment?.status,
      transaction_id: payment?.transaction_id,
      payment_gateway: payment?.gateway,
    });

    await orderRepo.save(order);

    const stockUpdate: any[] = [];

    // ================= ITEMS + STOCK =================
    for (const item of items) {

      const product = await productRepo
        .createQueryBuilder("product")
        .setLock("pessimistic_write")
        .where("product.id = :id", { id: item.product_id })
        .getOne();

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      if (product.status !== ProductStatus.ACTIVE) {
        throw new Error(`Product "${product.name}" is not active`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`${product.name} insufficient stock`);
      }

      const oldStock = product.stock;

      await itemRepo.save({
        order_id: order.id,
        product_id: product.id,
        price: item.price,
        quantity: item.quantity,
      });

      product.stock -= item.quantity;
      await productRepo.save(product);

      await logRepo.save({
        product_id: product.id,
        old_stock: oldStock,
        added_stock: -item.quantity,
        new_stock: product.stock,
        action: "ORDER_DEDUCT",
        created_by: user_id,
      });

      stockUpdate.push({
        product_id: product.id,
        product_name: product.name,
        old_stock: oldStock,
        new_stock: product.stock,
      });
    }

    await queryRunner.commitTransaction();

    // ================= LOAD FULL ORDER =================
    const fullOrder = await orderRepo.findOne({
      where: { id: order.id },
      relations: {
        items: {
          product: true
        },
      },
    });

    // ================= QR LINK =================
    const qr = await generateQR(
      `${process.env.BASE_URL}/orders/verify/${order.id}`
    );

    fullOrder!.qr_code = qr;
    await orderRepo.save(fullOrder!);

    // ================= PDF =================
    const filePath = await generateInvoicePDF(fullOrder, company);

    // ================= EMAIL =================
    await sendInvoiceEmail(company.email, filePath, invoice_no);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: fullOrder,
        breakdown: { subtotal, discount, total },
        stock_update: stockUpdate,
      },
    });

  } catch (error) {

    await queryRunner.rollbackTransaction();
    next(error);

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

@Get("/invoice/:id")
@Swagger("Download Invoice", "PDF download")

async download(req: Request, res: Response) {

  const order = await dataSource.getRepository(Order).findOne({
    where: { id: Number(req.params.id) },
    relations: {
      items: {
        product: true
      }
    }
  });

  if (!order) {
    return res.status(404).json({ message: "Not found" });
  }

  const company = await dataSource.getRepository(Register).findOne({
    where: { id: order.company_id }
  });

  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const toStr = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;

  const options = {
    theme: toStr(req.query.theme) || 'aurora',
    title: toStr(req.query.title) || 'TAX INVOICE',
    gst: toStr(req.query.gst) || (company as any).gst_number || 'N/A',
    notes: toStr(req.query.notes) || 'Thank you for your business!',
    branch: toStr(req.query.branch) || 'Main Branch',
    taxRate: toStr(req.query.taxRate) ? Number(req.query.taxRate) : 18,
    currency: toStr(req.query.currency) || '₹',
  };

  const filePath = await generateInvoicePDF(order, company, options);

  return res.download(filePath);
}
  
}


