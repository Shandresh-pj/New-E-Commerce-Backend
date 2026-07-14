// ─────────────────────────────────────────────────────────────────────────────
// src/dto/CreateBreakSetting.Dto.ts
//
// Break settings configure per-branch allowed break windows per day.
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PolicyBreakType } from "../entities/break_policy.entity";

export class CreateBreakSettingDto {
  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsNumber()
  @Min(0)
  lunch_minutes!: number;

  @IsNumber()
  @Min(0)
  tea_break_minutes!: number;

  @IsNumber()
  @Min(0)
  evening_break_minutes!: number;

  @IsBoolean()
  allow_overtime!: boolean;

  @IsNumber()
  @Min(60)  // Minimum 1 hour work
  standard_work_minutes!: number;
}

export class UpdateBreakSettingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  lunch_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tea_break_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  evening_break_minutes?: number;

  @IsOptional()
  @IsBoolean()
  allow_overtime?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(60)
  standard_work_minutes?: number;
}

// ─── Break Policy ───────────────────────────────────────────────────────────

export class CreateBreakPolicyDto {
  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(PolicyBreakType)
  break_type!: PolicyBreakType;

  @IsNumber()
  @Min(5)
  max_duration_minutes!: number;

  @IsNumber()
  @Min(1)
  max_frequency!: number;

  @IsOptional()
  @IsBoolean()
  allow_split?: boolean;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  /** Thresholds in minutes over policy limit that trigger each action */
  @IsOptional()
  deduction_rules?: {
    warning: number;
    salary_deduction: number;
    half_day: number;
    hr_review: number;
  };
}