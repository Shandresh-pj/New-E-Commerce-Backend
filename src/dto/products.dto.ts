import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
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
  barcode?: string;   // ✅ barcode added

  @IsOptional()
  @IsString()
  qr_code?: string;    // ✅ optional QR support

  @IsOptional()
  @IsNumber()
  registration_id?: number;

  @IsNumber()
  stock!: number;
}


export class ScanProductDto {
  @IsNotEmpty()
  @IsString()
  code!: string; // barcode or QR value
}