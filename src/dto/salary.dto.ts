import {
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateSalaryDto {

  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  month!: string;

  @IsNumber()
  year!: number;

  @IsNumber()
  basic_salary!: number;

  @IsOptional()
  @IsNumber()
  present_days?: number;

  @IsOptional()
  @IsNumber()
  leave_days?: number;

  @IsOptional()
  @IsNumber()
  absent_days?: number;

  @IsOptional()
  @IsNumber()
  overtime_minutes?: number;

  @IsOptional()
  @IsNumber()
  overtime_amount?: number;

  @IsOptional()
  @IsNumber()
  deduction_amount?: number;

  @IsOptional()
  @IsNumber()
  final_salary?: number;
}
