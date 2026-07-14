// ─────────────────────────────────────────────────────────────────────────────
// src/dto/order.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Enums ─────────────────────────────────────────────────────────────────

/** All supported payment channels */
export enum PaymentMethod {
  CASH             = "CASH",
  ONLINE           = "ONLINE",        // Generic online (legacy/default)
  STRIPE           = "STRIPE",
  PAYPAL           = "PAYPAL",
  RAZORPAY         = "RAZORPAY",
  UPI              = "UPI",
  WALLET           = "WALLET",
  EMI              = "EMI",
  PAY_LATER        = "PAY_LATER",
  BANK_TRANSFER    = "BANK_TRANSFER",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
  PAY_ON_DELIVERY  = "PAY_ON_DELIVERY",
  GIFT_CARD        = "GIFT_CARD",
  PARTIAL          = "PARTIAL",
}

/** Payment lifecycle states */
export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED  = "FAILED",
  REFUNDED = "REFUNDED",
}

/** Order lifecycle states */
export enum OrderStatus {
  PENDING   = "PENDING",
  CONFIRMED = "CONFIRMED",
  SHIPPED   = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  FAILED    = "FAILED",
}

// ─── Nested DTOs ───────────────────────────────────────────────────────────

export class OrderItemDto {
  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(0.01, { message: "price must be greater than 0" })
  price!: number;

  @IsNumber()
  @Min(1, { message: "quantity must be at least 1" })
  quantity!: number;
}

export class PaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  gateway?: string;
}

// ─── Request DTOs ──────────────────────────────────────────────────────────

export class CreateOrderDto {
  @IsNumber()
  user_id!: number;

  @IsArray()
  @ArrayMinSize(1, { message: "Cart cannot be empty" })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;
}