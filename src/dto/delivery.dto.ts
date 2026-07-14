// ─────────────────────────────────────────────────────────────────────────────
// src/dto/delivery.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export enum DeliveryPaymentType {
  PREPAID     = "PREPAID",
  COD         = "COD",
  ONLINE      = "ONLINE",
}

export enum DeliveryStatus {
  ASSIGNED  = "ASSIGNED",
  PICKED_UP = "PICKED_UP",
  ON_THE_WAY = "ON_THE_WAY",
  DELIVERED = "DELIVERED",
  FAILED    = "FAILED",
  RETURNED  = "RETURNED",
}

export class CreateDeliveryAssignmentDto {
  @IsNumber()
  order_id!: number;

  @IsNumber()
  employee_id!: number;  // delivery boy employee ID

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  @IsNotEmpty()
  pickup_address!: string;

  @IsString()
  @IsNotEmpty()
  delivery_address!: string;

  @IsEnum(DeliveryPaymentType)
  payment_type!: DeliveryPaymentType;

  @IsOptional()
  @IsString()
  estimated_arrival?: string;  // HH:mm or date-time string
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatus)
  status!: DeliveryStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
