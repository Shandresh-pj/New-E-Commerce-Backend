import { IPaymentStrategy } from "./IPaymentStrategy";
import { RazorpayStrategy } from "./strategies/RazorpayStrategy";
import { PaymentMethod } from "../../dto/order.dto";

export class PaymentContext {
  private strategy: IPaymentStrategy;

  constructor(provider: string) {
    switch (provider) {
      case PaymentMethod.RAZORPAY:
        this.strategy = new RazorpayStrategy();
        break;
      // Add other providers here as they are implemented
      // case PaymentMethod.STRIPE:
      //   this.strategy = new StripeStrategy();
      //   break;
      // case PaymentMethod.PAYPAL:
      //   this.strategy = new PayPalStrategy();
      //   break;
      default:
        throw new Error(`Payment provider ${provider} is not currently supported or implemented.`);
    }
  }

  public getStrategy(): IPaymentStrategy {
    return this.strategy;
  }
}
