import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEprCertificateDto {
  @ApiProperty({ example: 'RC-2026-0001', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  certificateNumber!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  issuerPartyId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  beneficiaryPartyId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  materialCategoryId!: number;

  @ApiProperty({ example: 50.0, minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  certificateQuantityMt!: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  issueDate!: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'PARTIALLY_UTILIZED', 'FULLY_UTILIZED', 'EXPIRED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'PARTIALLY_UTILIZED', 'FULLY_UTILIZED', 'EXPIRED', 'CANCELLED'])
  statusCode?: string;

  @ApiPropertyOptional({ example: 11 })
  @IsOptional()
  @IsInt()
  @Min(1)
  evidenceAttachmentId?: number;
}
