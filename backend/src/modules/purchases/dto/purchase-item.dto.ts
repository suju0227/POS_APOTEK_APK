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
import { PurchaseSellingPriceDto } from './purchase-selling-price.dto';

export const PURCHASE_DISCOUNT_TYPES = ['NONE', 'NOMINAL', 'PERCENT'] as const;
export type PurchaseDiscountType = (typeof PURCHASE_DISCOUNT_TYPES)[number];

export class PurchaseItemDto {
  @IsUUID()
  @IsOptional()
  purchaseOrderItemId?: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  productUnitId!: string;

  @IsString()
  batchNumber!: string;

  @IsDateString()
  expiredDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qtyPurchase!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @IsIn(PURCHASE_DISCOUNT_TYPES)
  @IsOptional()
  discountType?: PurchaseDiscountType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseSellingPriceDto)
  sellingPrices!: PurchaseSellingPriceDto[];
}
