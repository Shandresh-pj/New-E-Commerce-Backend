import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export enum ProductType {
  SINGLE = "single",
  VARIANT = "variant",
}

export enum ProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum ProductApprovalStatus {
  DRAFT = "Draft",
  PENDING = "Pending Approval",
  APPROVED = "Approved",
  PUBLISHED = "Published",
  REJECTED = "Rejected",
}

export class ProductVariantDto {
  @IsOptional()
  @IsNumber()
  Id?: number;

  @IsOptional()
  @IsNumber()
  CompanyId?: number;

  @IsOptional()
  @IsString()
  Barcode?: string;

  @IsNumber()
  @Min(0)
  Price!: number;

  @IsNumber()
  @Min(0)
  Stock!: number;

  @IsNotEmpty()
  @IsNumber()
  ProductAttributeId!: number;

  @IsNotEmpty()
  @IsNumber()
  ProductAttributeValueId!: number;
}

export class ProductAttributeValueLinkDto {
  @IsNotEmpty()
  @IsNumber()
  ProductAttributeId!: number;

  @IsNotEmpty()
  @IsNumber()
  ProductAttributeValueId!: number;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price!: number;

   @IsOptional()
  @IsString()
  @Matches(/^\d{8,14}$/)
  barcode?: string;   // ✅ barcode added

  @IsOptional()
  @IsNumber()
  registration_id?: number;

  @IsNumber()
  stock!: number;

  @IsOptional()
  @IsString()
  category!:string;

  @IsOptional()
  @IsEnum(ProductType)
  product_type?: ProductType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_in_hand?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueLinkDto)
  attribute_values?: ProductAttributeValueLinkDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  critical_stock_threshold?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8,14}$/)
  barcode?: string;

  @IsOptional()
  @IsNumber()
  registration_id?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ProductType)
  product_type?: ProductType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_in_hand?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueLinkDto)
  attribute_values?: ProductAttributeValueLinkDto[];

  // JSON string array of gallery image paths to keep on update; see
  // product.Controller.ts's parseExistingImages.
  @IsOptional()
  existing_images?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  critical_stock_threshold?: number;
}

export class ScanProductDto {
  @IsNotEmpty()
  @IsString()
  code!: string; // barcode or QR value
}

export class AddToCartDto {

  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;
}
