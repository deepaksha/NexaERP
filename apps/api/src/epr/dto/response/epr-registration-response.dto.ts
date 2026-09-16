import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EprRegistrationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  registrantPartyId!: number;

  @ApiProperty({ example: 3 })
  eprRoleId!: number;

  @ApiProperty({ example: 'CPCB-EPR-2026-0001' })
  registrationNumber!: string;

  @ApiProperty({ example: 'CPCB' })
  registrationAuthority!: string;

  @ApiProperty({ example: 'ACTIVE' })
  registrationStatus!: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  issueDate?: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  expiryDate?: string;

  @ApiPropertyOptional({ example: 10 })
  certificateAttachmentId?: number;

  @ApiProperty({ example: '2026-09-17T11:40:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-17T11:40:00.000Z' })
  updatedAt!: string;
}
