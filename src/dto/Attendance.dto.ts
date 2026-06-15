import {
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class AttendanceDto {

  @IsNumber()
  employee_id!: number;

  @IsString()
  check_in!: string;
}

export class CreateAttendanceBreakDto {

  @IsNumber()
  attendance_id!: number;

  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsString()
  break_type!: string;

  @IsString()
  start_time!: string;

  @IsOptional()
  @IsString()
  end_time?: string;
}