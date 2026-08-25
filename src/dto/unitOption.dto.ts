import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { UnitCategory } from "../entities/unit.entity";

export class CreateUnitOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol!: string;

  @IsEnum(UnitCategory)
  @IsNotEmpty()
  category!: UnitCategory;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class UpdateUnitOptionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol?: string;

  @IsOptional()
  @IsEnum(UnitCategory)
  category?: UnitCategory;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
