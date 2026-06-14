import {
  IsNumber,
  IsString,
  IsOptional
} from "class-validator";

export class CreatePaymentDto {

  @IsNumber()
  order_id!: number;

  @IsNumber()
  user_id!: number;

  @IsString()
  method!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  gateway?: string;
}