import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import {
  DISCOUNT_TYPES,
  DiscountType,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../../sales/dto/create-sale.dto';

export class CreateSaleFromPrescriptionDto {
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

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
