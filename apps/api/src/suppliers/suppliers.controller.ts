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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId ? Number(companyId) : undefined;
    return this.suppliersService.findAll(parsedCompanyId);
  }

  @Get('price-insights')
  priceInsights(@Query('product') product?: string, @Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId ? Number(companyId) : undefined;
    return this.suppliersService.getVendorPriceInsights(
      product,
      Number.isFinite(parsedCompanyId) ? parsedCompanyId : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateSupplierDto) {
    return this.suppliersService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSupplierDto) {
    return this.suppliersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.remove(id);
  }
}
