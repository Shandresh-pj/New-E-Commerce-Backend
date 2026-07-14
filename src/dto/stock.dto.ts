// ─────────────────────────────────────────────────────────────────────────────
// src/dto/stock.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum StockLogAction {
  ADD    = "ADD",
  REMOVE = "REMOVE",
  SET    = "SET",
  RETURN = "RETURN",
}

export class UpdateStockDto {
  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(StockLogAction)
  action!: StockLogAction;

  @IsOptional()
  @IsString()
  reason?: string;
}