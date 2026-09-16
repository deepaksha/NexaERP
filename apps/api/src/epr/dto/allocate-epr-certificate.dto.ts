import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllocateEprCertificateDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  certificateId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  eprObligationId!: number;

  @ApiProperty({ example: 20.0, minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  allocatedQuantityMt!: number;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  allocationDate?: string;
}
