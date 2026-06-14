import { AuthController } from "./auth.Controller";
import { CouponController } from "./coupons.Controller";
import { OrderController } from "./order.Controller";
import { OtpController } from "./otp.Controller";
import { ProductController } from "./product.Controller";

export const authController = new AuthController();

export const otpController = new OtpController();

export const productController = new ProductController();

export const orderController = new OrderController();

export const couponController = new CouponController();