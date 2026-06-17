import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { Match } from "../decorators";

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
  @IsNotEmpty()
  @IsString()
  reset_token!: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}

export class ChangeMyPasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, {
    message: "newPassword must be at least 8 characters long",
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).+/, {
    message:
      "newPassword must contain at least one uppercase letter, one lowercase letter, one number and one special character",
  })
  newPassword!: string;

  @IsNotEmpty()
  @IsString()
  @Match("newPassword", {
    message: "confirmPassword must match newPassword",
  })
  confirmPassword!: string;
}