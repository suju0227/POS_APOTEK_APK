import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { BatchPriceDto } from './batch-price.dto';

export class CreateBatchDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  batchNumber!: string;

  @IsDateString()
  expiredDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialStockBase!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStockBase!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hppBase!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchPriceDto)
  prices!: BatchPriceDto[];
}
