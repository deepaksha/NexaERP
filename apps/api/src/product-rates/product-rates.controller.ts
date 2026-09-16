import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductRateDto } from './dto/create-product-rate.dto';
import { UpdateProductRateDto } from './dto/update-product-rate.dto';
import { ProductRatesService } from './product-rates.service';

@Controller('product-rates')
export class ProductRatesController {
  constructor(private readonly productRatesService: ProductRatesService) {}

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('companyId') companyId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productRatesService.findAll({
      productId: productId ? Number(productId) : undefined,
      companyId: companyId ? Number(companyId) : undefined,
      fromDate,
      toDate,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('today')
  today(@Query('productIds') productIds?: string) {
    const parsed = (productIds ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    return this.productRatesService.findToday(parsed.length ? parsed : undefined);
  }

  @Get('history')
  history(@Query('productId') productId: string, @Query('days') days?: string) {
    return this.productRatesService.getLastDaysForProduct(Number(productId), days ? Number(days) : 5);
  }

  @Post()
  createOrUpdate(@Body() dto: CreateProductRateDto) {
    return this.productRatesService.upsert(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductRateDto) {
    return this.productRatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productRatesService.remove(id);
  }

  @Get('latest-map')
  latestMap(@Query('productIds') productIds?: string, @Query('rateDate') rateDate?: string) {
    const parsed = (productIds ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    return this.productRatesService.getLatestRateMap(parsed, rateDate);
  }
}
