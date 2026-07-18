import Razorpay from "razorpay";
import crypto from "crypto";
import { ApiError } from "../exceptions/ApiError";

export class RazorpayService {
  private razorpay: Razorpay | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (key_id && key_secret) {
      this.razorpay = new Razorpay({ key_id, key_secret });
    }
  }

  private getInstance(): Razorpay {
    if (!this.razorpay) {
      this.init();
      if (!this.razorpay) {
        throw new ApiError(500, "Razorpay keys not configured in environment");
      }
    }
    return this.razorpay;
  }

  async createOrder(amount: number, currency: string = "INR", receipt?: string): Promise<any> {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paisa
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        payment_capture: 1
      };
      
      const order = await this.getInstance().orders.create(options);
      return order;
    } catch (error: any) {
      throw new ApiError(500, `Failed to create Razorpay Order: ${error.message}`);
    }
  }

  async createSubscription(plan_id: string, customer_id?: string, total_count: number = 12): Promise<any> {
    try {
      const options: any = {
        plan_id,
        total_count,
        customer_notify: 1
      };
      if (customer_id) options.customer_id = customer_id;
      
      const subscription = await this.getInstance().subscriptions.create(options);
      return subscription;
    } catch (error: any) {
      throw new ApiError(500, `Failed to create Razorpay Subscription: ${error.message}`);
    }
  }

  verifySignature(order_id: string, payment_id: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new ApiError(500, "Razorpay Secret not configured");

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(order_id + "|" + payment_id)
      .digest("hex");
      
    return generated_signature === signature;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(500, "Razorpay Webhook Secret not configured");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
      
    return expectedSignature === signature;
  }

  async capturePayment(payment_id: string, amount: number, currency: string = "INR"): Promise<any> {
    try {
      return await this.getInstance().payments.capture(payment_id, amount * 100, currency);
    } catch (error: any) {
      throw new ApiError(500, `Failed to capture payment: ${error.message}`);
    }
  }

  async refundPayment(payment_id: string, amount?: number): Promise<any> {
    try {
      const options: any = {};
      if (amount) options.amount = Math.round(amount * 100);
      
      return await this.getInstance().payments.refund(payment_id, options);
    } catch (error: any) {
      throw new ApiError(500, `Failed to refund payment: ${error.message}`);
    }
  }
}

export const razorpayService = new RazorpayService();
