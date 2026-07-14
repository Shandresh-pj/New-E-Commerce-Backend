// ─────────────────────────────────────────────────────────────────────────────
// src/dto/category.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  parent_id?: number;

  @IsOptional()
  @IsNumber()
  StatusId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  parent_id?: number;

  @IsOptional()
  @IsNumber()
  StatusId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
