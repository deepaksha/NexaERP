import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingEntity } from '../billing/billing.entity';
import { CompanyEntity } from '../companies/company.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { PurchaseOrderEntity } from './purchase-order.entity';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrderEntity, CompanyEntity, SupplierEntity, BillingEntity])],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
