import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchaseItemDto } from './purchase-item.dto';

export const PURCHASE_TAX_MODES = [
  'NON_PPN',
  'PPN_INCLUDED',
  'PPN_EXCLUDED',
] as const;

export type PurchaseTaxMode = (typeof PURCHASE_TAX_MODES)[number];

export class CreatePurchaseDto {
  @IsUUID()
  supplierId!: string;

  @IsUUID()
  @IsOptional()
  purchaseOrderId?: string;

  @IsDateString()
  purchaseDate!: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsIn(PURCHASE_TAX_MODES)
  @IsOptional()
  taxMode?: PurchaseTaxMode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRatePercent?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  invoiceTotalInput?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  roundingAdjustment?: number;

  @IsString()
  @IsOptional()
  differenceNote?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
