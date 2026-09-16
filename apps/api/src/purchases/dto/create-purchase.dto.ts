import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

export class CreatePurchaseDto {
  @IsString()
  @Matches(invoiceNumberPattern, {
    message: 'invoiceNumber must be 3-30 characters and use only letters, numbers, - or /',
  })
  invoiceNumber!: string;

  @IsDateString()
  purchaseDate!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  productName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsIn(['Pending', 'Partial', 'Paid'])
  paymentStatus!: string;
}
