import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PrescriptionItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productUnitId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qtySaleUnit!: number;

  @IsString()
  @IsOptional()
  instruction?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
