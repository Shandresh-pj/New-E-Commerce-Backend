import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCompanyDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: "phone must be a valid 10-digit mobile number" })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    { message: "gst_number must be a valid GST number (e.g. 33ABCDE1234F1Z5)" }
  )
  gst_number?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  role_id?: number;
}

export class UpdateCompanyDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: "phone must be a valid 10-digit mobile number" })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    { message: "gst_number must be a valid GST number (e.g. 33ABCDE1234F1Z5)" }
  )
  gst_number?: string;
}
