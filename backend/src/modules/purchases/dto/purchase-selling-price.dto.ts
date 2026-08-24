import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class PurchaseSellingPriceDto {
  @IsUUID()
  productUnitId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sellingPrice!: number;
}
