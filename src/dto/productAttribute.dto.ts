// ─────────────────────────────────────────────────────────────────────────────
// src/dto/productAttribute.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT ATTRIBUTE (e.g. "Color", "Size")
// ═══════════════════════════════════════════════════════════════════════════

export class CreateProductAttributeDto {
  @IsNumber()
  company_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;          // Human-readable name, e.g. "Color"

  @IsOptional()
  @IsString()
  @MaxLength(50)
  attributeNameCode?: string;  // Machine-readable code, e.g. "COLOR"
}

export class UpdateProductAttributeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  attributeNameCode?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT ATTRIBUTE VALUE (e.g. "Red", "L")
// ═══════════════════════════════════════════════════════════════════════════

export class CreateProductAttributeValueDto {
  @IsNumber()
  company_id!: number;

  @IsNumber()
  @IsNotEmpty()
  product_attribute_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value!: string;          // Human-readable: "Red"

  @IsOptional()
  @IsString()
  @MaxLength(50)
  attributeValueCode?: string;  // Machine-readable: "RED"

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  product_ids?: number[];  // Pre-link to products on creation
}

export class UpdateProductAttributeValueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  attributeValueCode?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  product_ids?: number[];
}

// ═══════════════════════════════════════════════════════════════════════════
// LINK / UNLINK ATTRIBUTE VALUES TO A PRODUCT
// ═══════════════════════════════════════════════════════════════════════════

export class LinkAttributeValuesToProductDto {
  @IsNumber()
  product_id!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  attribute_value_ids!: number[];
}
