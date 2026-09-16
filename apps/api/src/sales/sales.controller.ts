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
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.salesService.findAll(parsedCompanyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get(':id/payments')
  listPayments(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.listPayments(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.salesService.create(body);
  }

  @Post(':id/payments')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.salesService.addPayment(id, body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.salesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.remove(id);
  }
}
