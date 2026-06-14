import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { FILE_TYPES, IsFile } from "../decorators";

export class RegisterDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  mobilenumber?: string;

  @IsOptional()
  address?: string;

  @IsFile(
    {
      mime: FILE_TYPES.IMAGES,
      maxSize: 5 * 1024 * 1024, // 5 MB
      required: false,
    },
    {
      message:
        "Only JPG, JPEG, PNG, GIF, WEBP images up to 5MB are allowed",
    }
  )
  @IsOptional()
  image?: string;

  @IsOptional()
  usertype?: string;

  @IsOptional()
  logintype?: string;
}

export class LoginDto {
  @IsOptional()
  email?: string;

  @IsOptional()
  mobilenumber?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}


export class CreateProfileDto {

  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsNotEmpty()
  mobilenumber: string;

  @IsNotEmpty()
  address: string;

  @IsFile(
    {
      mime: FILE_TYPES.IMAGES,
      maxSize: 5 * 1024 * 1024, // 5 MB
      required: false,
    },
    {
      message:
        "Only JPG, JPEG, PNG, GIF, WEBP images up to 5MB are allowed",
    }
  )
  @IsOptional()
  image?: string;

  @IsNotEmpty()
  usertype: string;

  @IsOptional()
  logintype?: string;

  @IsNotEmpty()
  status: string;
}

export class UpdateProfileDto {

  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  mobilenumber: string;

  @IsNotEmpty()
  address: string;

  @IsFile(
    {
      mime: FILE_TYPES.IMAGES,
      maxSize: 5 * 1024 * 1024, // 5 MB
      required: false,
    },
    {
      message:
        "Only JPG, JPEG, PNG, GIF, WEBP images up to 5MB are allowed",
    }
  )
  @IsOptional()
  image?: string;

  @IsOptional()
  usertype?: string;

  @IsOptional()
  status?: string;
} 