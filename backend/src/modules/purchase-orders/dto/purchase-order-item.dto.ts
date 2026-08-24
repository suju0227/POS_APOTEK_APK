import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PurchaseOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  productUnitId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qtyOrdered!: number;

  @IsString()
  @IsOptional()
  note?: string;
}
