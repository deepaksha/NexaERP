import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const poNumberPattern = /^PO-[A-Z0-9/-]{3,30}$/i;

export class PurchaseOrderItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  productName!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @Matches(poNumberPattern, { message: 'poNumber must be in format PO-XXXX and 6-33 chars' })
  poNumber!: string;

  @IsDateString()
  poDate!: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  requestNumber?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  itemDescription!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @ArrayMinSize(1)
  items?: PurchaseOrderItemDto[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  transportCharges?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  approvalRequiredRole?: string;

  @IsOptional()
  @IsIn(['Draft', 'PendingApproval', 'Approved', 'Rejected', 'Billed', 'Closed', 'Cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
