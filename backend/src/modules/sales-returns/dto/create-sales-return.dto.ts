import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SalesReturnItemDto } from './sales-return-item.dto';

export class CreateSalesReturnDto {
  @IsString()
  saleId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items!: SalesReturnItemDto[];
}
