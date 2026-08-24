import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateStockAdjustmentDto {
  @IsUUID()
  batchId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newQtyBase!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
