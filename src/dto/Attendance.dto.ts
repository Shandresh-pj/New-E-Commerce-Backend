// ─────────────────────────────────────────────────────────────────────────────
// src/dto/attendance.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import { BreakType } from "../entities/attendance.entity";

// ─── Time format: HH:mm or HH:mm:ss ──────────────────────────────────────
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE CHECK-IN / CHECK-OUT
// ═══════════════════════════════════════════════════════════════════════════

/** Manual / biometric check-in */
export class AttendanceDto {
  @IsNumber()
  employee_id!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: "check_in must be in HH:mm or HH:mm:ss format" })
  check_in!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  attendance_date?: string;  // DD:MM:YYYY — defaults to today if omitted

  @IsOptional()
  @IsNumber()
  device_id?: number;
}

/** Manual check-out override */
export class CheckOutDto {
  @IsNumber()
  employee_id!: number;

  @IsNumber()
  attendance_id!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: "check_out must be in HH:mm or HH:mm:ss format" })
  check_out!: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BREAK LOG
// ═══════════════════════════════════════════════════════════════════════════

export class CreateAttendanceBreakDto {
  @IsNumber()
  attendance_id!: number;

  @IsNumber()
  employee_id!: number;

  @IsNumber()
  company_id!: number;

  @IsNumber()
  branch_id!: number;

  @IsEnum(BreakType, { message: `break_type must be one of: ${Object.values(BreakType).join(", ")}` })
  break_type!: BreakType;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: "start_time must be in HH:mm or HH:mm:ss format" })
  start_time!: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "end_time must be in HH:mm or HH:mm:ss format" })
  end_time?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGULARIZATION
// ═══════════════════════════════════════════════════════════════════════════

/** Admin regularise a past attendance record */
export class RegularizeAttendanceDto {
  @IsNumber()
  attendance_id!: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  check_in?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  check_out?: string;

  @IsOptional()
  @IsString()
  regularization_note?: string;
}