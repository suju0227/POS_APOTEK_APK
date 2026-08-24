import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CheckoutSaleItemDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  productUnitId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qtySaleUnit!: number;

  @IsString()
  @IsOptional()
  note?: string;
}
