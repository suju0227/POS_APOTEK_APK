import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { BatchPriceDto } from './batch-price.dto';

export class UpdateBatchDto {
  @IsUUID()
  @IsOptional()
  supplierId?: string | null;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDateString()
  @IsOptional()
  expiredDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialStockBase?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStockBase?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  hppBase?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchPriceDto)
  @IsOptional()
  prices?: BatchPriceDto[];
}
