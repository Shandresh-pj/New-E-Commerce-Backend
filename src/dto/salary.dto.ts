// ─────────────────────────────────────────────────────────────────────────────
// src/dto/salary.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { PayrollStatus, PaymentMethod } from "../entities/salary";

export class CreateSalaryDto {
  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  @IsNotEmpty()
  month!: string;  // e.g. "July"

  @IsNumber()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsNumber()
  @Min(0)
  basic_salary!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  present_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  absent_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leave_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  half_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  late_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deduction_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  final_salary?: number;
}

export class ApproveSalaryDto {
  @IsEnum(PayrollStatus)
  status!: PayrollStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsString()
  payment_date?: string;  // DD:MM:YYYY

  @IsOptional()
  @IsString()
  remarks?: string;
}
