import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEprFilingEventDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  eprRegistrationId!: number;

  @ApiProperty({ example: 'Q1-2026-27', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  filingPeriod!: string;

  @ApiProperty({ enum: ['QUARTERLY', 'ANNUAL', 'AMENDMENT', 'RETURN'] })
  @IsString()
  @IsIn(['QUARTERLY', 'ANNUAL', 'AMENDMENT', 'RETURN'])
  filingType!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  @IsString()
  @IsIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  filingStatus!: string;

  @ApiPropertyOptional({ example: 'ACK-12345', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  acknowledgementNumber?: string;

  @ApiPropertyOptional({ example: '2026-07-30' })
  @IsOptional()
  @IsDateString()
  dueOn?: string;

  @ApiPropertyOptional({
    example: { portalReference: 'TXN-456', notes: 'Initial quarterly filing' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  filingPayload?: Record<string, unknown>;
}
