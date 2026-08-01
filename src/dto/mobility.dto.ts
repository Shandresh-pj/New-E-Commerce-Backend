import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { VehicleCategory } from "../entities/vehicle.entity";
import { BookingType, BookingStatus } from "../entities/mobility-booking.entity";

export class NearbyVehiclesDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  longitude!: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  radius_km?: number;
}

export class FareEstimateDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0.1)
  @Type(() => Number)
  distance_km!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  duration_minutes!: number;

  @IsString()
  @IsNotEmpty()
  vehicle_category!: string;

  @IsEnum(BookingType)
  @IsOptional()
  booking_type?: BookingType;
}

export class CreateMobilityBookingDto {
  @IsEnum(BookingType)
  @IsOptional()
  booking_type?: BookingType;

  @IsEnum(VehicleCategory)
  @IsNotEmpty()
  vehicle_category!: VehicleCategory;

  @IsString()
  @IsNotEmpty()
  pickup_address!: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  pickup_latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  pickup_longitude!: number;

  @IsString()
  @IsNotEmpty()
  drop_address!: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  drop_latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  drop_longitude!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.1)
  @Type(() => Number)
  distance_km!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  estimated_duration_minutes!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  total_fare!: number;

  @IsString()
  @IsOptional()
  payment_method?: string;

  @IsOptional()
  parcel_details?: any;

  @IsOptional()
  rental_details?: any;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  @IsNotEmpty()
  status!: BookingStatus;
}

export class DriverLocationPingDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  driver_id!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  longitude!: number;
}

export class VerifyKycDto {
  @IsEnum(["DRIVER", "VEHICLE"])
  @IsNotEmpty()
  type!: "DRIVER" | "VEHICLE";

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  id!: number;

  @IsEnum(["APPROVED", "REJECTED"])
  @IsNotEmpty()
  status!: "APPROVED" | "REJECTED";
}
