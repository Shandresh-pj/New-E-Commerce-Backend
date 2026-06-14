import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendOtpDto {

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class VerifyOtpDto {

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsNotEmpty()
  otp!: string;
}