// ─────────────────────────────────────────────────────────────────────────────
// src/dto/branchStock.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum StockAction {
  ADD    = "ADD",
  REMOVE = "REMOVE",
  SET    = "SET",       // force-set absolute stock value
}

export class UpdateBranchStockDto {
  @IsNumber()
  company_id!: number;

  @IsString()
  @IsNotEmpty()
  branch_name!: string;

  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(StockAction)
  action!: StockAction;

  @IsOptional()
  @IsString()
  reason?: string;  // audit note
}

export class TransferStockDto {
  @IsNumber()
  product_id!: number;

  @IsNumber()
  from_branch_id!: number;

  @IsNumber()
  to_branch_id!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}