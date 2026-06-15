import {
  IsNumber,
  IsString,
} from "class-validator";

export class CreateLeaveRequestDto {

  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  leave_type!: string;

  @IsString()
  from_date!: string;

  @IsString()
  to_date!: string;

  @IsNumber()
  total_days!: number;

  @IsString()
  reason!: string;
}