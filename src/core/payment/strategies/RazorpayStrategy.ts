import * as crypto from "crypto";
import { IPaymentStrategy, PaymentInitializationResult, PaymentVerificationPayload } from "../IPaymentStrategy";

export class RazorpayStrategy implements IPaymentStrategy {

  async createOrder(amount: number, currency: string, receipt: string, credentials: any): Promise<PaymentInitializationResult> {
    if (!credentials.key_id || !credentials.key_secret) {
      throw new Error("Razorpay credentials missing");
    }

    const Razorpay = require("razorpay");
    const instance = new Razorpay({
      key_id: credentials.key_id,
      key_secret: credentials.key_secret
    });

    const orderOptions = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit
      currency: currency,
      receipt: receipt
    };

    const razorpayOrder = await instance.orders.create(orderOptions);

    return {
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: credentials.key_id,
      metadata: razorpayOrder
    };
  }

  async verifyPayment(payload: PaymentVerificationPayload, credentials: any): Promise<boolean> {
    if (!credentials.key_secret) {
      throw new Error("Razorpay key_secret missing");
    }

    const { payment_id, order_id, signature } = payload;
    
    if (!payment_id || !order_id || !signature) {
      return false;
    }

    const hmac = crypto.createHmac("sha256", credentials.key_secret);
    hmac.update(order_id + "|" + payment_id);
    const generatedSignature = hmac.digest("hex");

    return generatedSignature === signature;
  }

  async processRefund(paymentId: string, amount: number, credentials: any): Promise<any> {
    if (!credentials.key_id || !credentials.key_secret) {
      throw new Error("Razorpay credentials missing");
    }

    const Razorpay = require("razorpay");
    const instance = new Razorpay({
      key_id: credentials.key_id,
      key_secret: credentials.key_secret
    });

    const refundOptions = {
      amount: Math.round(amount * 100)
    };

    return await instance.payments.refund(paymentId, refundOptions);
  }
}
