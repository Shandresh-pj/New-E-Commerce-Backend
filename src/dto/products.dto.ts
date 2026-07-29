// ─────────────────────────────────────────────────────────────────────────────
// src/dto/products.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Enums ─────────────────────────────────────────────────────────────────

export enum ProductType {
  SINGLE  = "single",
  VARIANT = "variant",
}

export enum ProductStatus {
  ACTIVE            = "active",
  INACTIVE          = "inactive",
  DRAFT             = "Draft",
  PENDING_APPROVAL  = "Pending Approval",
  APPROVED          = "Approved",
  PUBLISHED         = "Published",
  REJECTED          = "Rejected",
}

export enum ProductApprovalStatus {
  DRAFT     = "Draft",
  PENDING   = "Pending Approval",
  APPROVED  = "Approved",
  PUBLISHED = "Published",
  REJECTED  = "Rejected",
}

// ─── Nested DTOs ───────────────────────────────────────────────────────────

export class ProductUnitConversionDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  @IsNotEmpty()
  unit_name!: string;

  @IsString()
  @IsNotEmpty()
  unit_symbol!: string;

  @IsNumber()
  @Min(0.000001)
  conversion_to_base!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  is_sale_unit?: boolean;

  @IsOptional()
  is_purchase_unit?: boolean;
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
  @Matches(/^\d{8,14}$/, { message: "Barcode must be 8–14 digits" })
  Barcode?: string;

  @IsNumber()
  @Min(0)
  Price!: number;

  @IsNumber()
  @Min(0)
  Stock!: number;

  @IsNumber()
  @IsNotEmpty()
  ProductAttributeId!: number;

  @IsNumber()
  @IsNotEmpty()
  ProductAttributeValueId!: number;
}

export class ProductAttributeValueLinkDto {
  @IsNumber()
  @IsNotEmpty()
  ProductAttributeId!: number;

  @IsNumber()
  @IsNotEmpty()
  ProductAttributeValueId!: number;
}

// ─── Request DTOs ──────────────────────────────────────────────────────────

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8,14}$/, { message: "barcode must be 8–14 digits" })
  barcode?: string;

  @IsOptional()
  @IsNumber()
  registration_id?: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  base_unit?: string;

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
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retail_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesale_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dealer_price?: number;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitConversionDto)
  unit_conversions?: ProductUnitConversionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  critical_stock_threshold?: number;

  @IsOptional()
  user_id?: any;

  @IsOptional()
  company_id?: any;

  @IsOptional()
  branch_id?: any;

  @IsOptional()
  @IsString()
  manufacture_date?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8,14}$/, { message: "barcode must be 8–14 digits" })
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  base_unit?: string;

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
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(ProductApprovalStatus)
  approval_status?: ProductApprovalStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retail_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesale_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dealer_price?: number;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitConversionDto)
  unit_conversions?: ProductUnitConversionDto[];

  /** JSON-stringified array of existing gallery image paths to retain */
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

  @IsOptional()
  user_id?: any;

  @IsOptional()
  company_id?: any;

  @IsOptional()
  branch_id?: any;

  @IsOptional()
  @IsString()
  manufacture_date?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;
}

export class ScanProductDto {
  @IsString()
  @IsNotEmpty()
  code!: string;  // barcode or QR value
}

export class AddToCartDto {
  @IsNumber()
  product_id!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class UpdateCartDto {
  @IsNumber()
  @Min(0)
  quantity!: number;
}
