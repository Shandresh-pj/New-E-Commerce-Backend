// ─────────────────────────────────────────────────────────────────────────────
// src/dto/payment.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PaymentMethod, PaymentStatus } from "./order.dto";

export class CreatePaymentDto {
  @IsNumber()
  order_id!: number;

  @IsNumber()
  user_id!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  gateway?: string;
}

export class RefundPaymentDto {
  @IsNumber()
  payment_id!: number;

  @IsNumber()
  @Min(0.01)
  refund_amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}