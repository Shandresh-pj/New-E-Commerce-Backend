// ─────────────────────────────────────────────────────────────────────────────
// src/dto/role-access.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateRoleAccessDto {
  @IsNumber()
  company_id!: number;

  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsNumber()
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsBoolean()
  can_view!: boolean;

  @IsBoolean()
  can_add!: boolean;

  @IsBoolean()
  can_edit!: boolean;

  @IsBoolean()
  can_delete!: boolean;

  @IsBoolean()
  can_approve!: boolean;
}

export class UpdateRoleAccessDto {
  @IsOptional()
  @IsBoolean()
  can_view?: boolean;

  @IsOptional()
  @IsBoolean()
  can_add?: boolean;

  @IsOptional()
  @IsBoolean()
  can_edit?: boolean;

  @IsOptional()
  @IsBoolean()
  can_delete?: boolean;

  @IsOptional()
  @IsBoolean()
  can_approve?: boolean;
}