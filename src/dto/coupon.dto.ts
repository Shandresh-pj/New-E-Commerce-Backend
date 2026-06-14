import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Column } from "typeorm";

export class CreateCouponDto {

  @IsString()
  code!: string;

  @IsEnum(["percent", "flat"])
  type!: "percent" | "flat";

  @IsNumber()
  value!: number;

  @IsNumber()
  created_by!: number;

  @IsOptional()
  @IsNumber()
  buy_x?: number;

  @IsOptional()
  @IsNumber()
  get_y?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  product_ids!: number[];
}