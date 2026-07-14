// ─────────────────────────────────────────────────────────────────────────────
// src/dto/auth.dto.ts
//
// All authentication-related DTOs:
//   RegisterDto, LoginDto, CreateProfileDto, UpdateProfileDto
//   SendPasswordOtpDto, VerifyPasswordOtpDto, ChangePasswordDto,
//   ResetPasswordDto, ChangeMyPasswordDto,
//   SendOtpDto, VerifyOtpDto
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { FILE_TYPES, IsFile } from "../decorators";
import { Match } from "../decorators";

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RegisterDto — create a new user account.
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  mobilenumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  company_id?: number;

  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @IsFile(
    { mime: FILE_TYPES.IMAGES, maxSize: 5 * 1024 * 1024, required: false },
    { message: "Only JPG, JPEG, PNG, GIF, WEBP images up to 5 MB are allowed" }
  )
  @IsOptional()
  image?: string;

  @IsOptional()
  @IsString()
  usertype?: string;

  @IsOptional()
  @IsString()
  logintype?: string;
}

/**
 * LoginDto — login with email or mobile + password.
 */
export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobilenumber?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CreateProfileDto — admin-side user profile creation.
 */
export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  mobilenumber!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsFile(
    { mime: FILE_TYPES.IMAGES, maxSize: 5 * 1024 * 1024, required: false },
    { message: "Only JPG, JPEG, PNG, GIF, WEBP images up to 5 MB are allowed" }
  )
  @IsOptional()
  image?: string;

  @IsString()
  @IsNotEmpty()
  usertype!: string;

  @IsOptional()
  @IsString()
  logintype?: string;

  @IsString()
  @IsNotEmpty()
  status!: string;
}

/**
 * UpdateProfileDto — user self-update.
 */
export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  mobilenumber!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsFile(
    { mime: FILE_TYPES.IMAGES, maxSize: 5 * 1024 * 1024, required: false },
    { message: "Only JPG, JPEG, PNG, GIF, WEBP images up to 5 MB are allowed" }
  )
  @IsOptional()
  image?: string;

  @IsOptional()
  @IsString()
  usertype?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD
// ═══════════════════════════════════════════════════════════════════════════

/** Step 1 — request OTP to reset forgotten password */
export class SendPasswordOtpDto {
  @IsEmail()
  email!: string;
}

/** Step 2 — verify OTP */
export class VerifyPasswordOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;
}

/** Step 3 — submit new password with reset token */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  reset_token!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

/** In-app change password (must know current password) */
export class ChangePasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

/** Strong password change (8+ chars, upper, lower, number, special) */
export class ChangeMyPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: "newPassword must be at least 8 characters long" })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).+/, {
    message:
      "newPassword must contain at least one uppercase letter, one lowercase letter, one number and one special character",
  })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @Match("newPassword", { message: "confirmPassword must match newPassword" })
  confirmPassword!: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OTP
// ═══════════════════════════════════════════════════════════════════════════

export class SendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;
}
