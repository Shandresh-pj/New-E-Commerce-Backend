import { IsBoolean, IsNumber, Min } from "class-validator";

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
  @Min(1)
  standard_work_minutes!: number;
}