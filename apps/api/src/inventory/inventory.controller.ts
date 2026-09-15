import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.inventoryService.findAll(parsedCompanyId);
  }

  @Post()
  create(@Body() body: any) {
    return this.inventoryService.create(body);
  }
}
