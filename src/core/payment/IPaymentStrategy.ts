export interface PaymentInitializationResult {
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  metadata?: any;
}

export interface PaymentVerificationPayload {
  payment_id: string;
  order_id: string;
  signature?: string;
  raw_payload?: any;
}

export interface IPaymentStrategy {
  /**
   * Initializes a payment order with the provider (e.g. creating a Razorpay Order or Stripe PaymentIntent)
   */
  createOrder(amount: number, currency: string, receipt: string, credentials: any): Promise<PaymentInitializationResult>;

  /**
   * Verifies the payment response received from the client or webhook
   */
  verifyPayment(payload: PaymentVerificationPayload, credentials: any): Promise<boolean>;

  /**
   * Processes a refund for a given payment
   */
  processRefund(paymentId: string, amount: number, credentials: any): Promise<any>;
}
