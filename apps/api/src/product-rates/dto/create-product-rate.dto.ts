import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProductRateDto {
  @IsInt()
  productId!: number;

  @IsDateString()
  rateDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  rate!: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
