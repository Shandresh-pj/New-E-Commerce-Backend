import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthly_price!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  yearly_price!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  trial_days?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  features?: any;

  @IsString()
  @IsOptional()
  badge?: string;
}

export class UpdateSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  monthly_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  yearly_price?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  trial_days?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  features?: any;

  @IsString()
  @IsOptional()
  badge?: string;
}

export class SubscribeDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  plan_id!: number;

  @IsEnum(["monthly", "yearly"])
  @IsNotEmpty()
  billing_cycle!: "monthly" | "yearly";
}

export class VerifySubscriptionPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_order_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature!: string;
}
