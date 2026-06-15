import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";

export class SendPasswordOtpDto {
  @IsEmail()
  email!: string;
}

export class ChangePasswordDto {

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  oldPassword!: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}




export class VerifyPasswordOtpDto {

@IsEmail()
  email!: string;

  @IsNotEmpty()
  otp!: string;
}

export class ResetPasswordDto {
@IsEmail()
  email!: string;

  @IsNotEmpty()
  otp!: number;

  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}