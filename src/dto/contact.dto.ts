// ─────────────────────────────────────────────────────────────────────────────
// src/dto/contact.dto.ts
//
// Business / sales contact form — used for onboarding leads and enquiries.
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Enums ─────────────────────────────────────────────────────────────────

export enum ContactStatus {
  NEW         = "new",
  IN_PROGRESS = "in_progress",
  CONVERTED   = "converted",
  CLOSED      = "closed",
}

export enum BillingCycle {
  MONTHLY  = "monthly",
  QUARTERLY = "quarterly",
  YEARLY   = "yearly",
}

// ─── DTOs ──────────────────────────────────────────────────────────────────

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ownerName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: "phone must be a valid international phone number" })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gst?: string;

  @IsOptional()
  @IsUrl({}, { message: "website must be a valid URL" })
  website?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  selectedPlan?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  preferredPlan!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: "phone must be a valid international phone number" })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gst?: string;

  @IsOptional()
  @IsUrl({}, { message: "website must be a valid URL" })
  website?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredPlan?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
