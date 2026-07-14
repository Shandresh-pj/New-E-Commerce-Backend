// ─────────────────────────────────────────────────────────────────────────────
// src/dto/employee.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import { EmployeeType } from "../utils/Role-Access";

export class CreateEmployeeDto {
  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employee_code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: "mobile must be a valid 10-digit Indian mobile number" })
  mobile!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  designation!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsNumber()
  @Min(0)
  salary!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  working_hours?: number;

  @IsOptional()
  @IsString()
  joining_date?: string;  // ISO date string: YYYY-MM-DD

  @IsOptional()
  @IsString()
  profile_image?: string;

  @IsOptional()
  @IsEnum(EmployeeType)
  type?: EmployeeType;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: "mobile must be a valid 10-digit Indian mobile number" })
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  working_hours?: number;

  @IsOptional()
  @IsString()
  joining_date?: string;

  @IsOptional()
  @IsString()
  profile_image?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsEnum(EmployeeType)
  type?: EmployeeType;
}
