import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

export class CreateBillingDto {
  @IsString()
  @Matches(invoiceNumberPattern, {
    message: 'invoiceNumber must be 3-30 characters and use only letters, numbers, - or /',
  })
  invoiceNumber!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsIn(['SALE', 'PURCHASE'])
  billType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  purchaseOrderId?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  gstAmount!: number;

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

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  brokerId?: number;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  brokerageType?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  brokerageValue?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  originalBillAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  originalBillAttachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  journalNarration?: string;

  @IsIn(['Draft', 'Issued', 'Paid', 'Overdue'])
  status!: string;

  @IsIn(['Pending', 'Partial', 'Paid'])
  paymentStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
