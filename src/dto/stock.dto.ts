import {
  IsNumber,
  IsString
} from "class-validator";

export class UpdateStockDto {

  @IsNumber()
  product_id!: number;

  @IsNumber()
  quantity!: number;

  @IsString()
  action!: string;
}