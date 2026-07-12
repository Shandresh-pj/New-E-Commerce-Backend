import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @IsOptional()
  @IsString()
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
  phone!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  businessType!: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  selectedPlan?: string;

  @IsString()
  @IsNotEmpty()
  preferredPlan!: string;

  @IsString()
  @IsNotEmpty()
  billingCycle!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  preferredPlan?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
