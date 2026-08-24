import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  pharmacyName?: string;

  @IsString()
  @IsOptional()
  address?: string | null;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  expiredAlertDays?: number;

  @IsString()
  @IsOptional()
  timezone?: string;
}
