import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { BrokersService } from './brokers.service';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { UpdateBrokerDto } from './dto/update-broker.dto';

@Controller('brokers')
export class BrokersController {
  constructor(private readonly brokersService: BrokersService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId ? Number(companyId) : undefined;
    return this.brokersService.findAll(Number.isFinite(parsedCompanyId) ? parsedCompanyId : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.brokersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateBrokerDto) {
    return this.brokersService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateBrokerDto) {
    return this.brokersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.brokersService.remove(id);
  }
}
