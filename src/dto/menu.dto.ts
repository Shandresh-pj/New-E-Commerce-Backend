// ─────────────────────────────────────────────────────────────────────────────
// src/dto/menu.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PermissionType } from "../entities/menu";

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  menu!: string;  // menu name or path

  @IsEnum(PermissionType)
  action!: PermissionType;
}

export class AssignRoleAccessDto {
  @IsNumber()
  role_id!: number;

  @IsNumber()
  permissionId!: number;
}