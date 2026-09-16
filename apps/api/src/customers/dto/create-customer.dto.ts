import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const phonePattern = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(phonePattern, { message: 'phone must be a valid Indian mobile number' })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(gstPattern, { message: 'gstNumber must be a valid GSTIN' })
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  country?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
