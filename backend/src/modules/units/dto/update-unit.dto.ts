import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUnitDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  symbol?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
