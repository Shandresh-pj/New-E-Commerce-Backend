import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { Type } from "class-transformer";

/**
 * PAYMENT TYPE
 */
export enum PaymentMethod {
  CASH = "CASH",
  ONLINE = "ONLINE",
}

/**
 * PAYMENT STATUS
 */
export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/**
 * ORDER ITEM DTO
 */
export class OrderItemDto {

  @IsNumber()
  product_id!: number;

  @IsNumber()
  price!: number;

  @IsNumber()
  quantity!: number;
}

/**
 * PAYMENT DTO
 */
export class PaymentDto {

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}

/**
 * CREATE ORDER DTO
 */
export class CreateOrderDto {

  @IsNumber()
  user_id!: number;

  @IsArray()
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