import { Request, Response } from "express";
import { Controller, Post, Swagger } from "../decorators";
import { razorpayService } from "../services/razorpay.service";

@Controller("/payment")
export class PaymentCheckoutController {

  @Post("/create-order")
  @Swagger("Create Razorpay Order", "Creates a generic order for Razorpay checkout")
  async createOrder(req: Request, res: Response) {
    try {
      const { amount, currency, receipt } = req.body;

      if (!amount || amount < 100) {
        return res.status(400).json({ success: false, message: "Amount must be at least 100 paise" });
      }

      const order = await razorpayService.createOrder(amount / 100, currency || "INR", receipt);

      return res.json({ 
        success: true, 
        order_id: order.id, 
        amount: order.amount, 
        currency: order.currency 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post("/verify-payment")
  @Swagger("Verify Razorpay Payment", "Verifies the signature of a Razorpay payment")
  async verifyPayment(req: Request, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing payment verification fields" });
      }

      const isValid = razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

      if (!isValid) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }

      return res.json({ success: true, message: "Payment verified successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
