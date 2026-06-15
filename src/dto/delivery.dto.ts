import { IsNumber, IsString } from "class-validator";

export class CreateDeliveryAssignmentDto {

  @IsNumber()
  order_id!: number;

  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  pickup_address!: string;

  @IsString()
  delivery_address!: string;

  @IsString()
  payment_type!: string;
}
