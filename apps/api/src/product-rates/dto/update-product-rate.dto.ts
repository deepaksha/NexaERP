import { PartialType } from '@nestjs/mapped-types';
import { CreateProductRateDto } from './create-product-rate.dto';

export class UpdateProductRateDto extends PartialType(CreateProductRateDto) {}
