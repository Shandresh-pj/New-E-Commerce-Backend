import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
} from "class-validator";

export class CreateEmployeeDto {

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  employee_code!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  mobile!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  designation!: string;

  @IsString()
  department!: string;

  @IsString()
  role!: string;

  @IsNumber()
  salary!: number;

  @IsOptional()
  @IsNumber()
  working_hours?: number;

  @IsOptional()
  @IsString()
  joining_date?: string;

  @IsOptional()
  @IsString()
  profile_image?: string;
}
