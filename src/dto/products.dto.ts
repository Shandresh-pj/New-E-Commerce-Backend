import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Matches,
  Min,
} from "class-validator";

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
  @IsString()
  qr_code?: string;    // ✅ optional QR support

  @IsOptional()
  @IsNumber()
  registration_id?: number;

  @IsNumber()
  stock!: number;

  @IsOptional()
  @IsString()
  category!:string;
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