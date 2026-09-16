import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EprCertificateResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'RC-2026-0001' })
  certificateNumber!: string;

  @ApiProperty({ example: 2 })
  issuerPartyId!: number;

  @ApiProperty({ example: 1 })
  beneficiaryPartyId!: number;

  @ApiProperty({ example: 1 })
  materialCategoryId!: number;

  @ApiProperty({ example: 50.0 })
  certificateQuantityMt!: number;

  @ApiProperty({ example: '2026-07-01' })
  issueDate!: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  validFrom?: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  validTo?: string;

  @ApiProperty({ example: 'ACTIVE' })
  statusCode!: string;

  @ApiPropertyOptional({ example: 11 })
  evidenceAttachmentId?: number;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt!: string;
}
