import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
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
  @Min(1, { message: "Price must be greater than 0" })
  price!: number;

  @IsNumber()
  @Min(1, { message: "Quantity must be at least 1" })
  quantity!: number;
}

/**
 * PAYMENT DTO
 */
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

/**
 * CREATE ORDER DTO (IMPROVED)
 */
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