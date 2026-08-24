import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CheckoutSaleItemDto } from './checkout-sale-item.dto';

export const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'QRIS', 'DEBIT'] as const;
export const DISCOUNT_TYPES = ['NONE', 'PERCENT', 'NOMINAL'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export class CreateSaleDto {
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @IsIn(DISCOUNT_TYPES)
  discountType!: DiscountType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutSaleItemDto)
  items!: CheckoutSaleItemDto[];

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
