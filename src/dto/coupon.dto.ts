// ─────────────────────────────────────────────────────────────────────────────
// src/dto/coupon.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum CouponType {
  PERCENT      = "percent",
  FLAT         = "flat",
  BOGO         = "bogo",
  FREE_SHIPPING = "free_shipping",
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsNumber()
  created_by!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  buy_x?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  get_y?: number;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;   // ISO 8601

  @IsOptional()
  @IsDateString()
  start_date?: string;    // ISO 8601

  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  per_user_limit?: number;

  @IsOptional()
  @IsNumber()
  company_id?: number;

  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  product_ids!: number[];
}

export class UpdateCouponDto {
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  per_user_limit?: number;
}