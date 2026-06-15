import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from "class-validator";

export class CreateProductAttributeDto {

  @IsNumber()
  company_id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateProductAttributeDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class CreateProductAttributeValueDto {

  @IsNumber()
  company_id!: number;

  @IsNumber()
  @IsNotEmpty()
  product_attribute_id!: number;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsArray()
  product_ids?: number[];
}

export class UpdateProductAttributeValueDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  value?: string;

  @IsOptional()
  @IsArray()
  product_ids?: number[];
}
