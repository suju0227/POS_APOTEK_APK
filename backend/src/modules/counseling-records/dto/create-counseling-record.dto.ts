import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCounselingRecordDto {
  @IsString()
  @IsOptional()
  prescriptionId?: string;

  @IsString()
  @IsOptional()
  saleId?: string;

  @IsString()
  @IsOptional()
  patientName?: string;

  @IsDateString()
  @IsOptional()
  counselingDate?: string;

  @IsString()
  educationSummary!: string;

  @IsString()
  @IsOptional()
  note?: string;
}
