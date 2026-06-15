import {
  IsNumber,
  IsString,
  IsEnum,
} from "class-validator";

export enum StockAction {
  ADD = "ADD",
  REMOVE = "REMOVE",
}

export class UpdateBranchStockDto {

  @IsNumber()
  company_id!: number;

  @IsString()
  branch_name!: string;

  @IsNumber()
  product_id!: number;

  @IsNumber()
  quantity!: number;

  @IsEnum(StockAction)
  action!: StockAction;
}