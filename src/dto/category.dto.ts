import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateCategoryDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
  @MaxLength(100)
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
  parent_id?: number;

  @IsOptional()
  @IsNumber()
  StatusId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
