import { IsNumber, IsOptional, IsString } from "class-validator";
import { PermissionType } from "../entities/menu";




export class CreateMenuDto {

@IsString()
  name: string;
@IsString()
  path: string;
    @IsOptional()
@IsString()
  icon?: string;
}

export class CreatePermissionDto {
@IsString()
  menu: string;
@IsString()
  action: PermissionType;
}

export class CreateRoleAccessDto {
@IsNumber()
  role_id: number;
@IsNumber()
  permissionId: number;
}