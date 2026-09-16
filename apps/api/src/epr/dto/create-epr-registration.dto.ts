import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEprRegistrationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  registrantPartyId!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  eprRoleId!: number;

  @ApiProperty({ example: 'CPCB-EPR-2026-0001', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  registrationNumber!: string;

  @ApiPropertyOptional({ enum: ['CPCB', 'SPCB', 'PCC'], default: 'CPCB' })
  @IsOptional()
  @IsString()
  @IsIn(['CPCB', 'SPCB', 'PCC'])
  registrationAuthority?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING_RENEWAL'], default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING_RENEWAL'])
  registrationStatus?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  certificateAttachmentId?: number;
}
