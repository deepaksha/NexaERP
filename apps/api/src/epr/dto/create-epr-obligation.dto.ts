import { IsInt, IsNumber, IsString, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEprObligationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  eprRegistrationId!: number;

  @ApiProperty({ example: '2026-27', pattern: '^[0-9]{4}-[0-9]{2}$' })
  @IsString()
  @Matches(/^[0-9]{4}-[0-9]{2}$/)
  obligationYear!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  materialCategoryId!: number;

  @ApiProperty({ example: 120.5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  targetQuantityMt!: number;

  @ApiProperty({ example: 10.0, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  carryForwardMt!: number;
}
