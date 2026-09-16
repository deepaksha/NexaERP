import { ApiProperty } from '@nestjs/swagger';

export class EprCertificateAllocationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  certificateId!: number;

  @ApiProperty({ example: 1 })
  eprObligationId!: number;

  @ApiProperty({ example: 20.0 })
  allocatedQuantityMt!: number;

  @ApiProperty({ example: '2026-07-15' })
  allocationDate!: string;

  @ApiProperty({ example: '2026-09-17T12:05:00.000Z' })
  createdAt!: string;
}
