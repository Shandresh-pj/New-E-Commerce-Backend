import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
} from "class-validator";

export class CreateRoleAccessDto {

  @IsNumber()
  company_id!: number;

  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @IsString()
  @IsNotEmpty()
  role_name!: string;

  @IsString()
  @IsNotEmpty()
  module_name!: string;

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