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
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.productsService.findAll(search, parsedCompanyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
