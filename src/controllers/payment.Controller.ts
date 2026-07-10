import { Request, Response } from "express";
import { Controller, Post, Get, Middleware, Swagger } from "../decorators";
import validate from "../middleware/validate";
import { dataSource } from "../server";
import { Payment } from "../entities/payment";
import { CreatePaymentDto } from "../dto/payment.dto";
import { Order } from "../entities/order";
import { Company } from "../entities/company";
import { PaymentContext } from "../core/payment/PaymentContext";

@Controller("/payments")
export class PaymentController {

  @Post("/create")
  @Middleware([validate(CreatePaymentDto)])
  @Swagger("Create Payment", "Cash / Online Payment")
  async create(req: Request, res: Response) {
    const repo = dataSource.getRepository(Payment);
    const payment = repo.create(req.body);
    await repo.save(payment);
    return res.json({ success: true, data: payment });
  }

  @Get("/")
  async getAll(req: Request, res: Response) {
    const data = await dataSource.getRepository(Payment).find({
      order: { id: "DESC" }
    });
    return res.json({ success: true, data });
  }

  @Post("/razorpay/create-order")
  async createRazorpayOrder(req: any, res: Response) {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }

      const orderRepo = dataSource.getRepository(Order);
      const companyRepo = dataSource.getRepository(Company);

      const order = await orderRepo.findOne({ where: { id: order_id } });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const company = await companyRepo.findOne({ where: { id: order.company_id } });
      if (!company || !company.razorpay_key_id || !company.razorpay_key_secret) {
        return res.status(400).json({
          success: false,
          message: "Razorpay payment credentials are not configured for this company"
        });
      }

      // Delegate to PaymentContext & Strategy
      const paymentContext = new PaymentContext("RAZORPAY");
      const strategy = paymentContext.getStrategy();

      const result = await strategy.createOrder(
        Number(order.total),
        "INR",
        `receipt_order_${order.id}_${Date.now()}`,
        {
          key_id: company.razorpay_key_id,
          key_secret: company.razorpay_key_secret
        }
      );

      return res.json({
        success: true,
        order_id: order.id,
        amount: order.total,
        razorpay_order_id: result.order_id,
        currency: result.currency,
        razorpay_key_id: result.key_id
      });
    } catch (err: any) {
      console.error("Razorpay Order Creation Error:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create Razorpay order" });
    }
  }

  @Post("/razorpay/verify")
  async verifyRazorpayPayment(req: any, res: Response) {
    try {
      const {
        order_id,
        user_id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      } = req.body;

      if (!order_id || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing required verification parameters" });
      }

      const orderRepo = dataSource.getRepository(Order);
      const companyRepo = dataSource.getRepository(Company);
      const paymentRepo = dataSource.getRepository(Payment);

      const order = await orderRepo.findOne({ where: { id: order_id } });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const company = await companyRepo.findOne({ where: { id: order.company_id } });
      if (!company || !company.razorpay_key_secret) {
        return res.status(400).json({ success: false, message: "Razorpay credentials not found for verification" });
      }

      // Delegate to PaymentContext & Strategy
      const paymentContext = new PaymentContext("RAZORPAY");
      const strategy = paymentContext.getStrategy();

      const isVerified = await strategy.verifyPayment(
        {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          signature: razorpay_signature
        },
        { key_secret: company.razorpay_key_secret }
      );

      if (!isVerified) {
        return res.status(400).json({ success: false, message: "Invalid payment signature verification failed" });
      }

      // Record successful payment in database
      const payment = paymentRepo.create({
        order_id: Number(order_id),
        user_id: Number(user_id || req.user?.id || 1),
        method: "RAZORPAY",
        amount: Number(order.total),
        status: "SUCCESS",
        transaction_id: razorpay_payment_id,
        gateway: "RAZORPAY"
      });

      await paymentRepo.save(payment);

      // Update Order Payment Status
      order.payment_status = "PAID" as any;
      order.status = "CONFIRMED";
      order.transaction_id = razorpay_payment_id;
      order.gateway = "RAZORPAY";
      await orderRepo.save(order);

      return res.json({
        success: true,
        message: "Payment verified and recorded successfully",
        data: payment
      });
    } catch (err: any) {
      console.error("Razorpay Payment Verification Error:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to verify Razorpay payment" });
    }
  }
}
