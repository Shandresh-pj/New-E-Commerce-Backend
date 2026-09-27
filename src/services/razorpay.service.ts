/**
 * razorpay.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Razorpay API wrapper with security hardening.
 *
 * Security measures:
 *  1. Keys loaded lazily from env — never hardcoded.
 *  2. verifySignature uses timing-safe HMAC comparison (timingSafeEqual)
 *     to prevent timing oracle attacks.
 *  3. verifyWebhookSignature validates raw payload — caller must provide the
 *     unmodified bytes, not a re-serialised object.
 *  4. No credentials are ever returned from any method.
 *  5. Amount always converted to paise via Math.round (prevents float drift).
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import { ApiError } from "../exceptions/ApiError";

export class RazorpayService {
  private razorpay: Razorpay | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const key_id     = process.env.RAZORPAY_KEY_ID;
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

  async createOrder(
    amount: number,
    currency: string = "INR",
    receipt?: string
  ): Promise<any> {
    try {
      const options = {
        amount: Math.round(amount * 100), // always convert to paisa
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        payment_capture: 1,
      };

      const order = await this.getInstance().orders.create(options);
      return order;
    } catch (error: any) {
      throw new ApiError(500, `Failed to create Razorpay Order: ${error.message}`);
    }
  }

  async createSubscription(
    plan_id: string,
    customer_id?: string,
    total_count: number = 12
  ): Promise<any> {
    try {
      const options: any = {
        plan_id,
        total_count,
        customer_notify: 1,
      };
      if (customer_id) options.customer_id = customer_id;

      const subscription = await this.getInstance().subscriptions.create(options);
      return subscription;
    } catch (error: any) {
      throw new ApiError(500, `Failed to create Razorpay Subscription: ${error.message}`);
    }
  }

  /**
   * Timing-safe payment signature verification.
   * Uses crypto.timingSafeEqual to prevent timing oracle attacks.
   *
   * @param order_id     - Razorpay order ID (order_xxxx)
   * @param payment_id   - Razorpay payment ID (pay_xxxx)
   * @param signature    - Client-supplied HMAC-SHA256 hex signature
   */
  verifySignature(order_id: string, payment_id: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new ApiError(500, "Razorpay Secret not configured");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const suppliedBuf = Buffer.from(signature, "utf8");

    // Buffers must be the same length for timingSafeEqual
    if (expectedBuf.length !== suppliedBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, suppliedBuf);
  }

  /**
   * Timing-safe webhook signature verification.
   * The caller MUST pass the raw request bytes, not a re-serialised body.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(500, "Razorpay Webhook Secret not configured");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const suppliedBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== suppliedBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, suppliedBuf);
  }

  async capturePayment(
    payment_id: string,
    amount: number,
    currency: string = "INR"
  ): Promise<any> {
    try {
      return await this.getInstance().payments.capture(
        payment_id,
        Math.round(amount * 100),
        currency
      );
    } catch (error: any) {
      throw new ApiError(500, `Failed to capture payment: ${error.message}`);
    }
  }

  async refundPayment(payment_id: string, amount?: number): Promise<any> {
    try {
      const options: any = {};
      if (amount !== undefined) options.amount = Math.round(amount * 100);

      return await this.getInstance().payments.refund(payment_id, options);
    } catch (error: any) {
      throw new ApiError(500, `Failed to refund payment: ${error.message}`);
    }
  }
}

export const razorpayService = new RazorpayService();
