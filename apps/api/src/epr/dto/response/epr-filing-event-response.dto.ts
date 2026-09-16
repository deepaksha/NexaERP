import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EprFilingEventResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  eprRegistrationId!: number;

  @ApiProperty({ example: 'Q1-2026-27' })
  filingPeriod!: string;

  @ApiProperty({ example: 'QUARTERLY' })
  filingType!: string;

  @ApiProperty({ example: 'SUBMITTED' })
  filingStatus!: string;

  @ApiPropertyOptional({ example: 'ACK-12345' })
  acknowledgementNumber?: string;

  @ApiPropertyOptional({ example: '2026-09-17T11:45:00.000Z' })
  submittedOn?: string;

  @ApiPropertyOptional({ example: '2026-07-30' })
  dueOn?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { portalReference: 'TXN-456', notes: 'Initial quarterly filing' },
  })
  filingPayload?: Record<string, unknown>;

  @ApiProperty({ example: '2026-09-17T11:45:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-17T11:45:00.000Z' })
  updatedAt!: string;
}
