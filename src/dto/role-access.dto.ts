import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateRoleAccessDto {

  @IsNumber()
  company_id!: number;

  @IsOptional()
  @IsNumber()
  branch_id!: number;

  @IsString()
  role!: string;
  @IsNumber()
  user_id!: number;

  @IsString()
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