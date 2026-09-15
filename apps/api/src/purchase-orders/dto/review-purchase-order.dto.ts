import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPurchaseOrderDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @IsString()
  @MaxLength(80)
  actingRole!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}