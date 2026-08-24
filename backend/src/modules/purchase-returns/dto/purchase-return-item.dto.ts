import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class PurchaseReturnItemDto {
  @IsString()
  batchId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qtyBaseReturned!: number;
}
