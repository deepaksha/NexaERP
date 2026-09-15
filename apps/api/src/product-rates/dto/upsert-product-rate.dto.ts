import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpsertProductRateDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  companyId?: number;

  @IsDateString()
  rateDate!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
