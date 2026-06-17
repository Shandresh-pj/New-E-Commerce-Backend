import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRoleDto {

   @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  isActive?: boolean;
}