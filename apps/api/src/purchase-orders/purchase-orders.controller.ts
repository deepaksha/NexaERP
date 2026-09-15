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
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReviewPurchaseOrderDto } from './dto/review-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get('approval-rules')
  getApprovalRules() {
    return this.purchaseOrdersService.getApprovalRules();
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    const parsedSupplierId = supplierId ? Number(supplierId) : undefined;
    return this.purchaseOrdersService.findAll({
      companyId: parsedCompanyId,
      supplierId: parsedSupplierId,
      status,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, body);
  }

  @Patch(':id/approval')
  reviewApproval(@Param('id', ParseIntPipe) id: number, @Body() body: ReviewPurchaseOrderDto) {
    return this.purchaseOrdersService.reviewApproval(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.remove(id);
  }
}
