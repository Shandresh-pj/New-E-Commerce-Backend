// ─────────────────────────────────────────────────────────────────────────────
// src/dto/leave.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { LeaveStatus } from "../entities/leave.entity";

export enum LeaveType {
  CASUAL    = "CASUAL",
  SICK      = "SICK",
  EMERGENCY = "EMERGENCY",
  EARNED    = "EARNED",
}

export class CreateLeaveRequestDto {
  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsEnum(LeaveType, { message: `leave_type must be one of: ${Object.values(LeaveType).join(", ")}` })
  leave_type!: LeaveType;

  @IsString()
  @IsNotEmpty()
  from_date!: string;  // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  to_date!: string;    // YYYY-MM-DD

  @IsNumber()
  @Min(1)
  total_days!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ApproveLeaveDto {
  @IsEnum(LeaveStatus)
  status!: LeaveStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}