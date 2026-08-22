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
  @IsOptional()
  @IsNumber()
  company_id?: number;

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

export class RequestTransferDto {
  @IsString()
  @IsNotEmpty()
  from_branch!: string;

  @IsString()
  @IsNotEmpty()
  to_branch!: string;

  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveTransferDto {
  @IsString()
  @IsNotEmpty()
  action!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}