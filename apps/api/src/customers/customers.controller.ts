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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.customersService.findAll(parsedCompanyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateCustomerDto) {
    return this.customersService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCustomerDto) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
