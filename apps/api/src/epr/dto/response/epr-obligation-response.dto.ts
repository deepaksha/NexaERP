import { ApiProperty } from '@nestjs/swagger';

export class EprObligationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  eprRegistrationId!: number;

  @ApiProperty({ example: '2026-27' })
  obligationYear!: string;

  @ApiProperty({ example: 1 })
  materialCategoryId!: number;

  @ApiProperty({ example: 120.5 })
  targetQuantityMt!: number;

  @ApiProperty({ example: 10.0 })
  carryForwardMt!: number;

  @ApiProperty({ example: '2026-09-17T11:50:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-17T11:50:00.000Z' })
  updatedAt!: string;
}
