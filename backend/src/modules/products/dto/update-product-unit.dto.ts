import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateProductUnitDto {
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  conversionToBase?: number;

  @IsBoolean()
  @IsOptional()
  isDefaultSaleUnit?: boolean;

  @IsBoolean()
  @IsOptional()
  isSaleUnit?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  minSaleQty?: number;

  @IsString()
  @IsOptional()
  saleUnitNote?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
