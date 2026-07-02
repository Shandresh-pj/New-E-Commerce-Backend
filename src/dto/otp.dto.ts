import { IsEmail, IsNotEmpty, IsOptional } from "class-validator";

export class SendOtpDto {

  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  otp!: string;
}
